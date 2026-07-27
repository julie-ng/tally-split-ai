import { z } from 'zod'

/**
 * Batch-patch expenses in the caller's household.
 *
 * Collection-level PATCH: { ids, patch }. `patch` is an allow-list — only the
 * fields named in the schema can be batch-updated:
 *   - isSettled   → batch settle / unsettle
 *   - needsReview → batch flag / clear the review flag
 *
 * Exactly ONE field per request: each routes to a different op with its own
 * eligibility rules and side effects, so mixing them would make the response
 * shape ("what was updated, and why not the rest") ambiguous.
 *
 * The actual mutations live in server/utils/expenses; this handler only
 * validates, routes by the patched field, and shapes the response.
 */
const batchPatchSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  patch: z.object({
    isSettled: z.boolean().optional(),
    needsReview: z.boolean().optional(),
  }).refine(
    p => Object.values(p).filter(v => v !== undefined).length === 1,
    { message: 'Patch exactly one field per request (isSettled or needsReview)' },
  ),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const result = await readValidatedBody(event, body => batchPatchSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { ids, patch } = result.data

  const principal = event.context.securityPrincipal

  // Route by which field was patched. Each op owns its own eligibility rules;
  // `verb` is only for logging + the response message.
  const isSettlePatch = patch.isSettled !== undefined
  const run = isSettlePatch
    ? () => expensesUtils.setSettled(db, { householdId, ids, isSettled: patch.isSettled, principal })
    : () => expensesUtils.setNeedsReview(db, { householdId, ids, needsReview: patch.needsReview, principal })

  const verb = isSettlePatch
    ? (patch.isSettled ? 'settled' : 'unsettled')
    : (patch.needsReview ? 'flagged for review' : 'cleared for review')

  try {
    const updated = await run()

    const updatedIds = updated.map(r => r.id)
    log.info(
      {
        requested: ids.length,
        updated: updated.length,
        patch,
        requestedIds: ids,
        updatedIds,
      },
      `Batch ${verb}`,
    )

    return {
      success: true,
      updatedCount: updated.length,
      updatedIds,
      updated,
      message: `Successfully ${verb} ${updated.length} expense(s)`,
    }
  }
  catch (err) {
    log.error(
      {
        requested: ids.length,
        patch,
        err,
      },
      'Failed to batch patch expenses',
    )
    throw createError({
      statusCode: 500,
      message: 'Failed to update expenses',
      data: err.message,
    })
  }
})
