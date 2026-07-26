import { eq, and, inArray } from 'drizzle-orm'

/**
 * Fully delete a set of uploads for a household, cascading through their
 * receipts when appropriate.
 *
 * A receipt can have MORE than one upload. So per doomed receipt we compare how
 * many of its uploads are being deleted against its total upload count:
 *   • ALL of them → delete the *receipt* and let the FK cascade
 *     (uploads/expenses/receiptHistory → receipts, onDelete: cascade) remove the
 *     upload rows, the expense, and history in one statement.
 *   • only SOME → delete just those upload rows directly and keep the receipt
 *     (its remaining uploads + expense stay intact).
 * Uploads with no receiptId (in the pre-OCR window) are deleted directly.
 *
 * Azure blobs live outside Postgres, so the cascade can't touch them. BEFORE
 * deleting, we read every doomed upload's blob names and mint short-lived
 * DELETE-only SAS URLs (full image + thumbnail). The caller hands these to the
 * delete-blobs Trigger task, which deletes them via plain HTTP — the task never
 * needs the storage account key.
 *
 * Scoped by householdId directly (uploads carry their own household_id — see
 * schema.ts). Any ids the caller doesn't own are dropped (never throws).
 *
 * @param {object} db - Drizzle db (or tx)
 * @param {object} opts
 * @param {string} opts.householdId
 * @param {string[]} opts.ids
 * @returns {Promise<{ deletedIds: string[], deletedReceiptIds: string[], blobDeleteUrls: string[] }>}
 *   deletedIds = upload ids removed; deletedReceiptIds = receipt ids the cascade
 *   removed (so the caller can evict them from the receipts cache).
 */
export async function deleteMany (db, { householdId, ids }) {
  return db.transaction(async (tx) => {
    // Resolve which requested ids the household actually owns. Lock the rows for
    // the duration of the tx.
    const owned = await tx
      .select({
        id: schema.uploads.id,
        receiptId: schema.uploads.receiptId,
        blobName: schema.uploads.blobName,
        thumbnailName: schema.uploads.thumbnailName,
      })
      .from(schema.uploads)
      .where(
        and(
          eq(schema.uploads.householdId, householdId),
          inArray(schema.uploads.id, ids),
        ),
      )
      .for('update')

    if (owned.length === 0) {
      return { deletedIds: [], deletedReceiptIds: [], blobDeleteUrls: [] }
    }

    // Blob URLs for EVERY doomed upload — whether removed via receipt-cascade or
    // deleted directly. Collected before any delete runs.
    const blobNames = []
    for (const u of owned) {
      if (u.blobName) {
        blobNames.push(u.blobName)
      }
      if (u.thumbnailName) {
        blobNames.push(u.thumbnailName)
      }
    }
    const blobDeleteUrls = blobNames.map(name =>
      azureStorageUtils.generateBlobSasToken(name, {
        permissions: 'delete',
        expiresInMinutes: 5,
      }).sasUrl,
    )

    // Group doomed uploads by receiptId to decide receipt-cascade vs row-delete.
    const doomedByReceipt = new Map()
    const noReceiptUploadIds = []
    for (const u of owned) {
      if (u.receiptId) {
        const list = doomedByReceipt.get(u.receiptId) ?? []
        list.push(u.id)
        doomedByReceipt.set(u.receiptId, list)
      }
      else {
        noReceiptUploadIds.push(u.id)
      }
    }

    const receiptIdsToDelete = []
    const uploadIdsToDelete = [...noReceiptUploadIds]

    for (const [receiptId, doomedUploadIds] of doomedByReceipt) {
      // Total uploads still attached to this receipt.
      const siblings = await tx
        .select({ id: schema.uploads.id })
        .from(schema.uploads)
        .where(eq(schema.uploads.receiptId, receiptId))

      if (doomedUploadIds.length >= siblings.length) {
        // Every upload of this receipt is being deleted → drop the receipt and
        // let the cascade take its uploads/expense/history.
        receiptIdsToDelete.push(receiptId)
      }
      else {
        // Only some — delete just those upload rows, keep the receipt.
        uploadIdsToDelete.push(...doomedUploadIds)
      }
    }

    if (receiptIdsToDelete.length > 0) {
      await tx
        .delete(schema.receipts)
        .where(inArray(schema.receipts.id, receiptIdsToDelete))
    }

    if (uploadIdsToDelete.length > 0) {
      await tx
        .delete(schema.uploads)
        .where(inArray(schema.uploads.id, uploadIdsToDelete))
    }

    return {
      deletedIds: owned.map(u => u.id),
      deletedReceiptIds: receiptIdsToDelete,
      blobDeleteUrls,
    }
  })
}
