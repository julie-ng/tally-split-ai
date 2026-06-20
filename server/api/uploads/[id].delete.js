import { eq, and, ne, count } from 'drizzle-orm'

/**
 * Delete Azure blobs (original + thumbnail) for an upload.
 * Logs warnings on thumbnail failures but throws on original blob failure.
 */
async function deleteAzureBlobs (log, upload) {
  const results = { originalBlob: false, thumbnail: false }

  if (upload.status !== 'uploaded') return results

  if (upload.blobName) {
    await azureStorageUtils.deleteBlob(upload.blobName)
    results.originalBlob = true
  }

  if (upload.thumbnailName) {
    try {
      await azureStorageUtils.deleteBlob(upload.thumbnailName)
      results.thumbnail = true
    }
    // eslint-disable-next-line no-unused-vars
    catch (thumbnailError) {
      log.warn({ id: upload.id, blob: upload.thumbnailName }, 'Thumbnail not found or already deleted')
    }
  }

  return results
}

export default defineEventHandler(async (event) => {
  const log = useLogger('upload')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const id = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { uploadId: id })

  azureStorageUtils.useAzureStorageConfig()

  // Fetch the upload record
  const [upload] = await db
    .select()
    .from(schema.uploads)
    .where(eq(schema.uploads.id, id))
    .limit(1)

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload with id '${id}' not found`,
    })
  }

  // Delete Azure blobs for this upload
  // eslint-disable-next-line no-useless-assignment
  let blobsDeletionResults = { originalBlob: false, thumbnail: false }
  try {
    blobsDeletionResults = await deleteAzureBlobs(log, upload)
  }
  catch (error) {
    log.error({ id, blob: upload.blobName, err: error }, 'Failed to delete blobs from Azure')
    throw createError({
      statusCode: 500,
      message: 'Failed to delete blobs from Azure Storage',
      data: { error: error.message },
    })
  }

  let receiptDeleted = false

  if (upload.receiptId) {
    // Count sibling uploads for the same receipt (excluding this one)
    const [{ siblingCount }] = await db
      .select({ siblingCount: count() })
      .from(schema.uploads)
      .where(and(
        eq(schema.uploads.receiptId, upload.receiptId),
        ne(schema.uploads.id, id),
      ))

    if (siblingCount === 0) {
      // Last upload for this receipt — delete the receipt; FK cascade
      // removes the split, this upload, and all related history rows.
      await db
        .delete(schema.receipts)
        .where(eq(schema.receipts.id, upload.receiptId))

      receiptDeleted = true
      log.info({ receiptId: upload.receiptId }, 'Deleted receipt (last upload) — splits, uploads, and history cascaded')
    }
  }

  // If receipt was not deleted (siblings exist, or no receipt), delete just this upload
  if (!receiptDeleted) {
    await db
      .delete(schema.uploads)
      .where(eq(schema.uploads.id, id))
  }

  log.info({ id, receiptDeleted }, 'Upload deleted')

  return {
    success: true,
    deleted: { id },
    receiptDeleted,
    blobsDeletionResults,
  }
})
