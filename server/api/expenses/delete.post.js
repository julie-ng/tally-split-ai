import { z } from 'zod'

/**
 * Batch-delete expenses in the caller's household.
 *
 * POST (not DELETE) so the { ids } body survives legacy proxies/caches that
 * strip DELETE bodies. The mutation + household scoping live in
 * server/utils/expenses (expensesUtils.deleteMany); this handler only
 * validates and shapes the response.
 */
const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const result = await readValidatedBody(event, body => batchDeleteSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { ids } = result.data

  try {
    const deleted = await expensesUtils.deleteMany(db, { householdId, ids })

    const deletedIds = deleted.map(r => r.id)
    log.info(
      {
        requested: ids.length,
        deleted: deleted.length,
        requestedIds: ids,
        deletedIds,
      },
      'Batch deleted (history cascaded)',
    )

    return {
      success: true,
      deletedCount: deleted.length,
      deletedIds,
      message: `Successfully deleted ${deleted.length} expense(s)`,
    }
  }
  catch (err) {
    log.error(
      {
        requested: ids.length,
        err,
      },
      'Failed to batch delete expenses',
    )
    throw createError({
      statusCode: 500,
      message: 'Failed to delete expenses',
      data: err.message,
    })
  }
})
