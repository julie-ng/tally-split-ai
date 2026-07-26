import { z } from 'zod'
import { tasks } from '@trigger.dev/sdk/v3'

/**
 * Batch-delete uploads in the caller's household.
 *
 * POST (not DELETE) so the { ids } body survives legacy proxies/caches that
 * strip DELETE bodies. The per-upload receipt cascade (delete the receipt when
 * ALL its uploads are selected, else just the upload rows) + household scoping
 * live in server/utils/uploads (uploadsUtils.deleteMany); this handler
 * validates, offloads Azure blob deletion to the delete-blobs task, and shapes
 * the response.
 *
 * Note: in-flight "queue" rows (no DB record yet) are handled entirely
 * client-side — their ids never reach here, so any unknown id is simply dropped
 * by deleteMany's household scoping.
 */
const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('upload')
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
    const { deletedIds, deletedReceiptIds, blobDeleteUrls } = await uploadsUtils.deleteMany(db, { householdId, ids })

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
        deletedReceiptIds,
        blobs: blobDeleteUrls.length,
      },
      'Batch deleted uploads (receipt cascade where applicable); blob cleanup queued',
    )

    return {
      success: true,
      deletedCount: deletedIds.length,
      deletedIds,
      deletedReceiptIds,
      message: `Successfully deleted ${deletedIds.length} upload(s)`,
    }
  }
  catch (err) {
    log.error(
      {
        requested: ids.length,
        err,
      },
      'Failed to batch delete uploads',
    )
    throw createError({
      statusCode: 500,
      message: 'Failed to delete uploads',
      data: err.message,
    })
  }
})
