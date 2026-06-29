import { z } from 'zod'
import { tasks } from '@trigger.dev/sdk/v3'

/**
 * Batch-delete expenses in the caller's household.
 *
 * POST (not DELETE) so the { ids } body survives legacy proxies/caches that
 * strip DELETE bodies. The cascade delete + household scoping live in
 * server/utils/expenses (expensesUtils.deleteMany); this handler validates,
 * offloads Azure blob deletion to the delete-blobs task, and shapes the
 * response.
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
    const { deletedIds, blobDeleteUrls } = await expensesUtils.deleteMany(db, { householdId, ids })

    // Offload Azure blob cleanup — the DB rows are already gone; orphaned blobs
    // are harmless if this is delayed/retried, so don't block the response.
    if (blobDeleteUrls.length > 0) {
      await tasks.trigger('delete-blobs', { blobDeleteUrls })
    }

    log.info(
      {
        requested: ids.length,
        deleted: deletedIds.length,
        requestedIds: ids,
        deletedIds,
        blobs: blobDeleteUrls.length,
      },
      'Batch deleted (receipts + cascade); blob cleanup queued',
    )

    return {
      success: true,
      deletedCount: deletedIds.length,
      deletedIds,
      message: `Successfully deleted ${deletedIds.length} expense(s)`,
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
