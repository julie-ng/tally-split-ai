import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
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
      message: `Upload with hashId '${hashId}' not found`
    })
  }

  const upload = uploadRecord[0]

  // Delete blobs from Azure Storage (only if upload was completed)
  const deletionResults = {
    originalBlob: false,
    thumbnail: false
  }

  if (upload.status === 'uploaded') {
    try {
      // Delete original blob
      if (upload.blobName) {
        await azureStorageUtils.deleteBlob(upload.blobName)
        deletionResults.originalBlob = true
        console.log(`✅ Deleted blob: ${upload.blobName}`)
      }

      // Delete thumbnail if it exists
      if (upload.thumbnailName) {
        try {
          await azureStorageUtils.deleteBlob(upload.thumbnailName)
          deletionResults.thumbnail = true
          console.log(`✅ Deleted thumbnail: ${upload.thumbnailName}`)
        } catch (thumbnailError) {
          // Thumbnail might not exist yet (upload interrupted before thumbnail created)
          console.warn(`⚠️ Thumbnail not found or already deleted: ${upload.thumbnailName}`)
        }
      }
    } catch (error) {
      console.error('❌ Error deleting blobs from Azure:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to delete blobs from Azure Storage',
        data: { error: error.message }
      })
    }
  } else {
    console.log(`ℹ️ Skipping blob deletion - upload status is '${upload.status}', not 'uploaded'`)
  }

  // Delete the database record
  const result = await db
    .delete(schema.uploads)
    .where(eq(schema.uploads.hashId, hashId))
    .returning()

  return {
    success: true,
    deleted: result[0],
    blobsDeletionResults: deletionResults
  }
})
