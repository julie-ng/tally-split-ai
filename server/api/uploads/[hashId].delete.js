import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('upload')
  const db = useDB()
  requireUserId(event)
  requireHashIdParam(event)

  const hashId = getRouterParam(event, 'hashId')

  azureStorageUtils.useAzureStorageConfig()

  // First, fetch the record to get blob names
  const uploadRecord = await db
    .select()
    .from(schema.uploads)
    .where(eq(schema.uploads.hashId, hashId))
    .limit(1)

  if (uploadRecord.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Upload with hashId '${hashId}' not found`,
    })
  }

  const upload = uploadRecord[0]

  // Delete blobs from Azure Storage (only if upload was completed)
  const deletionResults = {
    originalBlob: false,
    thumbnail: false,
  }

  if (upload.status === 'uploaded') {
    try {
      // Delete original blob
      if (upload.blobName) {
        await azureStorageUtils.deleteBlob(upload.blobName)
        deletionResults.originalBlob = true
      }

      // Delete thumbnail if it exists
      if (upload.thumbnailName) {
        try {
          await azureStorageUtils.deleteBlob(upload.thumbnailName)
          deletionResults.thumbnail = true
        }
        // eslint-disable-next-line no-unused-vars
        catch (thumbnailError) {
          log.warn({ hashId, blob: upload.thumbnailName }, 'Thumbnail not found or already deleted')
        }
      }
    }
    catch (error) {
      log.error({ hashId, blob: upload.blobName, err: error }, 'Failed to delete blobs from Azure')
      throw createError({
        statusCode: 500,
        message: 'Failed to delete blobs from Azure Storage',
        data: { error: error.message },
      })
    }
  }

  // Delete the database record
  const result = await db
    .delete(schema.uploads)
    .where(eq(schema.uploads.hashId, hashId))
    .returning()

  log.info({ hashId, blobUrl: upload.blobUrl, thumbnailUrl: upload.thumbnailUrl || undefined }, 'Upload deleted')

  return {
    success: true,
    deleted: result[0],
    blobsDeletionResults: deletionResults,
  }
})
