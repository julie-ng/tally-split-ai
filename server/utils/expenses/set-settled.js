import { eq, and, isNotNull, inArray } from 'drizzle-orm'

/**
 * Batch settle / unsettle expenses, scoped to a household.
 *
 * Settle and unsettle are symmetric but not identical: they have opposite
 * eligibility filters and opposite `settledAt` side effects. The caller passes
 * the desired `isSettled` value; this op derives everything else.
 *
 *  - isSettled=true  (settle):   only rows that are not-yet-settled AND have a
 *                                paidByUserId; stamps settledAt = now.
 *  - isSettled=false (unsettle): only rows that are currently settled; clears
 *                                settledAt = null.
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
 * @param {boolean} opts.isSettled - target value
 * @param {string} opts.principal - security principal for history (event.context.securityPrincipal)
 * @returns {Promise<object[]>} the updated rows (empty if none eligible)
 */
export async function setSettled (db, { householdId, ids, isSettled, principal }) {
  const log = useLogger('expense:setSettled')
  return db.transaction(async (tx) => {
    // Read the raw rows by id (no eligibility/household filter) so the log shows
    // exactly why each requested id is or isn't eligible (state per resource id).
    const rawRows = await tx
      .select()
      .from(schema.expenses)
      .where(inArray(schema.expenses.id, ids))
    log.info(
      {
        householdId,
        isSettled,
        requestedIds: ids,
        rows: rawRows.map(r => ({
          id: r.id,
          householdId: r.householdId,
          receiptId: r.receiptId,
          paidByUserId: r.paidByUserId,
          isSettled: r.isSettled,
        })),
      },
      'Requested rows + current state',
    )

    // Eligibility flips with direction.
    const eligibility = isSettled
      ? and(eq(schema.expenses.isSettled, false), isNotNull(schema.expenses.paidByUserId))
      : eq(schema.expenses.isSettled, true)

    // Lock + read full rows scoped to the household via expenses.householdId
    // directly — reaches standalone (receiptId null) expenses too.
    const beforeRows = await tx
      .select()
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.householdId, householdId),
          eligibility,
          inArray(schema.expenses.id, ids),
        ),
      )
      .for('update')

    log.info(
      {
        eligibleCount: beforeRows.length,
        eligibleIds: beforeRows.map(r => r.id),
      },
      'Rows eligible after household + eligibility filter',
    )

    if (beforeRows.length === 0) return []

    const targetIds = beforeRows.map(r => r.id)

    const afterRows = await tx
      .update(schema.expenses)
      .set({
        isSettled,
        settledAt: isSettled ? new Date() : null,
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
