import { z } from 'zod'

/**
 * Batch-patch expenses in the caller's household.
 *
 * Collection-level PATCH: { ids, patch }. `patch` is an allow-list — only the
 * fields named in the schema can be batch-updated. Today that is `isSettled`
 * (batch settle / unsettle). The actual mutation, eligibility rules, and
 * side effects live in server/utils/expenses (expensesUtils.setSettled); this
 * handler only validates, routes by the patched field, and shapes the response.
 */
const batchPatchSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  patch: z.object({
    isSettled: z.boolean(),
  }),
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

  try {
    const updated = await expensesUtils.setSettled(db, {
      householdId,
      ids,
      isSettled: patch.isSettled,
      principal: event.context.securityPrincipal,
    })

    const verb = patch.isSettled ? 'settled' : 'unsettled'
    const updatedIds = updated.map(r => r.id)
    log.info(
      {
        requested: ids.length,
        updated: updated.length,
        isSettled: patch.isSettled,
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
        isSettled: patch.isSettled,
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
