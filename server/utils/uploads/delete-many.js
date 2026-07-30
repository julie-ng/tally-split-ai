import { eq, and, inArray } from 'drizzle-orm'

/**
 * Fully delete a set of uploads for a household, cascading through their
 * receipts when appropriate.
 *
 * A receipt has exactly ONE upload (enforced by the `uploads_receipt_id_unique`
 * partial index), so deleting an upload always takes its receipt with it:
 *   • has a receiptId → delete the *receipt* and let the FK cascade
 *     (uploads/expenses/receiptHistory → receipts, onDelete: cascade) remove the
 *     upload row, the expense, and history in one statement.
 *   • no receiptId (the pre-OCR window) → delete the upload row directly.
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
export async function deleteManyUploads (db, { householdId, ids }) {
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

    // 1:1 — an upload WITH a receipt is removed by the receipt cascade; one
    // without (the pre-OCR window) has its row deleted directly.
    const receiptIdsToDelete = []
    const uploadIdsToDelete = []
    for (const u of owned) {
      if (u.receiptId) {
        receiptIdsToDelete.push(u.receiptId)
      }
      else {
        uploadIdsToDelete.push(u.id)
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
