import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import { splitTaskResolutionSchema } from '#shared/utils/zod-schemas/split.schema.js'
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
  const log = useLogger('split')
  const db = useDB()

  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const splitId = parseInt(getRouterParam(event, 'id'), 10)
  await guards.requireAuthorization(event, { splitId })

  const result = await readValidatedBody(event, body => splitTaskResolutionSchema.safeParse(body))
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
      .from(schema.splits)
      .where(eq(schema.splits.id, splitId))
      .for('update')

    if (!before) {
      throw createError({
        statusCode: 404,
        message: `Split with ID '${splitId}' not found`,
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
      .update(schema.splits)
      .set(updates)
      .where(eq(schema.splits.id, splitId))
      .returning()

    await historyUtils.trackChanges(tx, {
      historyTable: schema.splitHistory,
      entityId: splitId,
      entityIdColumn: 'splitId',
      source: event.context.securityPrincipal,
      sourceVersion: llm?.sourceVersion ?? null,
      confidence: llm?.confidence ?? null,
      reasoning: llm?.reasoning ?? null,
      fieldConfidence: llm?.fieldConfidence ?? null,
    }, before, updated)

    return updated
  })

  log.info({ splitId, paidByMatch: after.paidByMatch }, 'Resolved split via task callback')

  return {
    success: true,
    updated: after,
  }
})

/**
 * Match raw LLM initials to one of the split's two user slots.
 * Case-insensitive comparison against users.initials.
 *
 * @returns {Promise<{ paidByUserId: string|null, paidByMatch: string }>}
 */
async function _resolvePaidBy (tx, { initials, userOneId, userTwoId }) {
  if (!initials) {
    return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISSING }
  }

  const slotIds = [userOneId, userTwoId].filter(Boolean)
  if (slotIds.length === 0) {
    // Degenerate household state — no one to match against
    return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
  }

  const candidates = await tx
    .select({ id: schema.users.id, initials: schema.users.initials })
    .from(schema.users)
    .where(inArray(schema.users.id, slotIds))

  const target = initials.trim().toLowerCase()
  const matched = candidates.find(c => c.initials?.toLowerCase() === target)

  if (matched) {
    return { paidByUserId: matched.id, paidByMatch: PAID_BY_MATCH.MATCHED }
  }
  return { paidByUserId: null, paidByMatch: PAID_BY_MATCH.MISMATCHED }
}
