import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { expenseTaskResolutionSchema } from '#shared/utils/zod-schemas/expense.schema.js'
import { PAID_BY_MATCH } from '#shared/enums/paid-by-match.js'

/**
 * Task-only endpoint for the adjust-split workflow callback.
 *
 * Owns the LLM contract for paidBy resolution: the trigger task posts raw
 * initials (no userId — PII boundary), and this endpoint maps initials →
 * userId by looking up household members. Sets paidByMatch in the same
 * transaction. Frozen LLM signal — never written by humans (see docs/SCHEMA.md).
 *
 * Also accepts adjusted split amount + per-user shares so all adjust-split
 * writes flow through one task-scoped endpoint, separate from human PUT.
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

  const { adjustedTotal, userOneShare, userTwoShare, paidByInitials, llm } = result.data

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

    // Resolve paidBy: match initials against household members in the slot.
    // Only userOne and userTwo are eligible — paidBy must be a participant.
    const { paidByUserId, paidByMatch } = await _resolvePaidBy(tx, {
      initials: paidByInitials,
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
 * Match a raw LLM payer hint to one of the split's two user slots.
 *
 * The hint can be initials (from handwritten annotations) or a name
 * (from custom-instructions context, e.g. "Matt"). Strategy:
 *   - Length <= 3: exact case-insensitive match against users.initials
 *   - Length > 3:  case-insensitive substring match against users.displayName.
 *                  Ambiguous (both users match) → MISMATCHED.
 *
 * @returns {Promise<{ paidByUserId: string|null, paidByMatch: string }>}
 */
async function _resolvePaidBy (tx, { initials, userOneId, userTwoId }) {
  if (!initials) {
    return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISSING }
  }

  const slotIds = [userOneId, userTwoId].filter(Boolean)
  if (slotIds.length === 0) {
    return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
  }

  const candidates = await tx
    .select({ id: schema.users.id, initials: schema.users.initials, displayName: schema.users.displayName })
    .from(schema.users)
    .where(inArray(schema.users.id, slotIds))

  const target = initials.trim().toLowerCase()

  if (target.length <= 3) {
    const matched = candidates.find(c => c.initials?.toLowerCase() === target)
    if (matched) {
      return { paidByUserId: matched.id, paidByMatch: PAID_BY_MATCH.MATCHED }
    }
    return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
  }

  const nameMatches = candidates.filter(c => c.displayName?.toLowerCase().includes(target))
  if (nameMatches.length === 1) {
    return { paidByUserId: nameMatches[0].id, paidByMatch: PAID_BY_MATCH.MATCHED }
  }
  return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
}
