import { eq, and, inArray } from 'drizzle-orm'

/**
 * Batch set / clear the review flag on expenses, scoped to a household.
 *
 * Simpler than setSettled: no eligibility rules (any expense can be flagged or
 * cleared, in either direction) and no side-effect column — the who/when/why
 * lives in `changes` + `expense_history`, which is why there is no reviewedAt.
 *
 * Rows already at the target value are filtered out, so the returned set is the
 * rows that actually CHANGED. That keeps the history clean (no no-op change
 * rows) and lets the caller reconcile optimistic updates against reality.
 *
 * Scoped by expenses.householdId directly (NOT a receipt join): expenses carry
 * householdId as a write-once column precisely so standalone expenses
 * (receiptId null) are still reachable — joining through receipts would silently
 * drop them. Any ids the caller doesn't own are dropped (never throws).
 *
 * @param {object} db - Drizzle db (or tx)
 * @param {object} opts
 * @param {string} opts.householdId
 * @param {string[]} opts.ids
 * @param {boolean} opts.needsReview - target value
 * @param {string} opts.principal - security principal for history (event.context.securityPrincipal)
 * @returns {Promise<object[]>} the updated rows (empty if none eligible)
 */
export async function setNeedsReview (db, { householdId, ids, needsReview, principal }) {
  const log = useLogger('expense:setNeedsReview')
  return db.transaction(async (tx) => {
    // Lock + read rows scoped to the household, skipping any already at the
    // target value (a no-op update would still write a history row).
    const beforeRows = await tx
      .select()
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.householdId, householdId),
          eq(schema.expenses.needsReview, !needsReview),
          inArray(schema.expenses.id, ids),
        ),
      )
      .for('update')

    log.info(
      {
        householdId,
        needsReview,
        requestedIds: ids,
        eligibleIds: beforeRows.map(r => r.id),
      },
      'Rows eligible after household + already-at-target filter',
    )

    if (beforeRows.length === 0) return []

    const targetIds = beforeRows.map(r => r.id)

    const afterRows = await tx
      .update(schema.expenses)
      .set({
        needsReview,
        updatedAt: new Date(),
      })
      .where(inArray(schema.expenses.id, targetIds))
      .returning()

    const afterById = Object.fromEntries(afterRows.map(r => [r.id, r]))
    const entities = beforeRows.map(r => ({
      entityId: r.id,
      before: r,
      after: afterById[r.id],
    }))

    await historyUtils.trackBatchChanges(tx, {
      historyTable: schema.expenseHistory,
      entityIdColumn: 'expenseId',
      source: principal,
    }, entities)

    return afterRows
  })
}
