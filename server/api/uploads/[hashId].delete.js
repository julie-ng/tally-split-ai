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
      log.warn({ hashId: upload.hashId, blob: upload.thumbnailName }, 'Thumbnail not found or already deleted')
    }
  }

  return results
}

export default defineEventHandler(async (event) => {
  const log = useLogger('upload')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireHashIdParam(event)

  const hashId = getRouterParam(event, 'hashId')
  await guards.requireAuthorization(event, { uploadHashId: hashId })

  azureStorageUtils.useAzureStorageConfig()

  // Fetch the upload record
  const [upload] = await db
    .select()
    .from(schema.uploads)
    .where(eq(schema.uploads.hashId, hashId))
    .limit(1)

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload with hashId '${hashId}' not found`,
    })
  }

  // Delete Azure blobs for this upload
  let blobsDeletionResults = { originalBlob: false, thumbnail: false }
  try {
    blobsDeletionResults = await deleteAzureBlobs(log, upload)
  }
  catch (error) {
    log.error({ hashId, blob: upload.blobName, err: error }, 'Failed to delete blobs from Azure')
    throw createError({
      statusCode: 500,
      message: 'Failed to delete blobs from Azure Storage',
      data: { error: error.message },
    })
  }

  let deletedReceipt = null
  let deletedSplit = null

  if (upload.receiptId) {
    // Count sibling uploads for the same receipt (excluding this one)
    const [{ siblingCount }] = await db
      .select({ siblingCount: count() })
      .from(schema.uploads)
      .where(and(
        eq(schema.uploads.receiptId, upload.receiptId),
        ne(schema.uploads.hashId, hashId),
      ))

    if (siblingCount === 0) {
      // Last upload for this receipt — delete receipt and split too
      const [receipt] = await db
        .select()
        .from(schema.receipts)
        .where(eq(schema.receipts.id, upload.receiptId))
        .limit(1)

      if (receipt) {
        if (receipt.splitId) {
          const [split] = await db
            .delete(schema.splits)
            .where(eq(schema.splits.id, receipt.splitId))
            .returning()
          deletedSplit = split || null
        }

        // Deleting the receipt cascade-deletes this upload via FK
        await db
          .delete(schema.receipts)
          .where(eq(schema.receipts.id, upload.receiptId))

        deletedReceipt = receipt
        log.info({ receiptId: receipt.id, splitId: receipt.splitId || undefined }, 'Deleted associated receipt and split (last upload)')
      }
    }
  }

  // If receipt was not deleted (siblings exist, or no receipt), delete just this upload
  if (!deletedReceipt) {
    await db
      .delete(schema.uploads)
      .where(eq(schema.uploads.hashId, hashId))
  }

  // Track deletions in history (audit trail only — no UI to surface these yet)
  if (deletedReceipt) {
    await historyUtils.trackDelete(db, {
      historyTable: schema.receiptHistory,
      entityId: deletedReceipt.id,
      entityIdColumn: 'receiptId',
      source: event.context.securityPrincipal,
    }, deletedReceipt)
  }

  if (deletedSplit) {
    await historyUtils.trackDelete(db, {
      historyTable: schema.splitHistory,
      entityId: deletedSplit.id,
      entityIdColumn: 'splitId',
      source: event.context.securityPrincipal,
    }, deletedSplit)
  }

  log.info({
    hashId,
    receiptDeleted: !!deletedReceipt,
    splitDeleted: !!deletedSplit,
  }, 'Upload deleted')

  return {
    success: true,
    deleted: { hashId },
    receiptDeleted: !!deletedReceipt,
    splitDeleted: !!deletedSplit,
    blobsDeletionResults,
  }
})
