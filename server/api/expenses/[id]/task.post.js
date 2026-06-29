import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { expenseTaskResolutionSchema } from '#shared/utils/zod-schemas/expense.schema.js'
import { PAID_BY_MATCH } from '#shared/enums/paid-by-match.js'

/**
 * Task-only endpoint for the adjust-expense workflow callback.
 *
 * Owns the LLM contract for paidBy resolution. The LLM is given the two members
 * keyed by slot (no userId — PII boundary) and returns the payer as a slot
 * ('user1'/'user2'), 'mismatched' (read initials matching neither member), or
 * null. This endpoint maps slot → the expense's userOneId/userTwoId and sets
 * paidByMatch. Frozen LLM signal — never written by humans (see docs/SCHEMA.md).
 *
 * Also accepts adjusted split amount + per-user shares (the LLM's asymmetric
 * allocation) so all adjust-expense writes flow through one task-scoped
 * endpoint, separate from human PUT.
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()

  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const expenseId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { expenseId })

  const result = await readValidatedBody(event, body => expenseTaskResolutionSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { adjustedTotal, userOneShare, userTwoShare, paidBySlot, llm } = result.data

  // tx is the Drizzle transaction object — same query API as db, but every
  // operation runs in one Postgres transaction (commits on resolve, rolls
  // back on throw). Required so the row lock, update, and history insert
  // are atomic.
  const after = await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.id, expenseId))
      .for('update')

    if (!before) {
      throw createError({
        statusCode: 404,
        message: `Expense with ID '${expenseId}' not found`,
      })
    }

    // Resolve paidBy from the LLM's slot answer → the expense's user slots.
    const { paidByUserId, paidByMatch } = _resolvePaidBySlot(paidBySlot, {
      userOneId: before.userOneId,
      userTwoId: before.userTwoId,
    })

    const updates = {
      paidByMatch,
      paidByUserId,
      updatedAt: new Date(),
    }

    if (adjustedTotal != null && adjustedTotal !== before.splitAmount) {
      updates.splitAmount = adjustedTotal
    }
    if (userOneShare !== undefined) updates.userOneShare = userOneShare
    if (userTwoShare !== undefined) updates.userTwoShare = userTwoShare

    const [updated] = await tx
      .update(schema.expenses)
      .set(updates)
      .where(eq(schema.expenses.id, expenseId))
      .returning()

    await historyUtils.trackChanges(tx, {
      historyTable: schema.expenseHistory,
      entityId: expenseId,
      entityIdColumn: 'expenseId',
      source: event.context.securityPrincipal,
      sourceVersion: llm?.sourceVersion ?? null,
      confidence: llm?.confidence ?? null,
      reasoning: llm?.reasoning ?? null,
      fieldConfidence: llm?.fieldConfidence ?? null,
    }, before, updated)

    return updated
  })

  log.info({ expenseId, paidByMatch: after.paidByMatch }, 'Resolved expense via task callback')

  // Task-only endpoint (HMAC principal). Return an acknowledgment, not the row —
  // a write-scoped token must not gain an incidental read of the full split.
  return { success: true }
})

/**
 * Map the LLM's slot-based payer answer to one of the expense's two user slots.
 *
 * The LLM is given the members keyed by slot and does the identity reasoning
 * (incl. fuzzy name matching like "Julia" vs "Julie"), so this is a pure map —
 * no name/initials matching here:
 *   - 'user1'      → userOneId, MATCHED
 *   - 'user2'      → userTwoId, MATCHED
 *   - 'mismatched' → null,      MISMATCHED (LLM read initials matching no member)
 *   - null/absent  → null,      MISSING    (no payer signal)
 *
 * A slot whose userId is unexpectedly null (single-member household) falls back
 * to MISMATCHED rather than asserting a bad MATCHED.
 *
 * @param {'user1'|'user2'|'mismatched'|null|undefined} slot
 * @returns {{ paidByUserId: string|null, paidByMatch: string }}
 */
function _resolvePaidBySlot (slot, { userOneId, userTwoId }) {
  if (slot === 'user1') {
    return userOneId
      ? { paidByUserId: userOneId, paidByMatch: PAID_BY_MATCH.MATCHED }
      : { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
  }
  if (slot === 'user2') {
    return userTwoId
      ? { paidByUserId: userTwoId, paidByMatch: PAID_BY_MATCH.MATCHED }
      : { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
  }
  if (slot === 'mismatched') {
    return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
  }
  return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISSING }
}
