import { eq, and, inArray } from 'drizzle-orm'

/**
 * Fully delete a set of expenses for a household, including their receipts and
 * everything that hangs off those receipts.
 *
 * Deletion direction leverages the FKs: for an expense WITH a receiptId we
 * delete the *receipt*, and the cascade (expenses/uploads/receiptHistory →
 * receipts, onDelete: cascade) removes the expense, its upload rows, and history
 * in one statement. Standalone expenses (receiptId null) have no receipt, so we
 * delete those rows directly.
 *
 * Azure blobs live outside Postgres, so the cascade can't touch them. BEFORE
 * deleting, we read the affected uploads' blob names and mint short-lived
 * DELETE-only SAS URLs (full image + thumbnail). The caller hands these to the
 * delete-blobs Trigger task, which deletes them via plain HTTP — the task never
 * needs the storage account key.
 *
 * Scoped by householdId directly (NOT a receipt join) so standalone expenses
 * stay reachable. Any ids the caller doesn't own are dropped (never throws).
 *
 * @param {object} db - Drizzle db (or tx)
 * @param {object} opts
 * @param {string} opts.householdId
 * @param {string[]} opts.ids
 * @returns {Promise<{ deletedIds: string[], blobDeleteUrls: string[] }>}
 */
export async function deleteMany (db, { householdId, ids }) {
  return db.transaction(async (tx) => {
    // Resolve which requested ids the household actually owns, and split them by
    // whether they have a receipt. Lock the rows for the duration of the tx.
    const owned = await tx
      .select({ id: schema.expenses.id, receiptId: schema.expenses.receiptId })
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.householdId, householdId),
          inArray(schema.expenses.id, ids),
        ),
      )
      .for('update')

    if (owned.length === 0) {
      return { deletedIds: [], blobDeleteUrls: [] }
    }

    const receiptIds = owned.filter(e => e.receiptId).map(e => e.receiptId)
    const standaloneIds = owned.filter(e => !e.receiptId).map(e => e.id)

    // Collect blob names from the uploads attached to the doomed receipts BEFORE
    // the cascade removes those upload rows.
    let blobDeleteUrls = []
    if (receiptIds.length > 0) {
      const uploads = await tx
        .select({
          blobName: schema.uploads.blobName,
          thumbnailName: schema.uploads.thumbnailName,
        })
        .from(schema.uploads)
        .where(inArray(schema.uploads.receiptId, receiptIds))

      const blobNames = []
      for (const u of uploads) {
        if (u.blobName) {
          blobNames.push(u.blobName)
        }
        if (u.thumbnailName) {
          blobNames.push(u.thumbnailName)
        }
      }

      blobDeleteUrls = blobNames.map(name =>
        azureStorageUtils.generateBlobSasToken(name, {
          permissions: 'delete',
          expiresInMinutes: 5,
        }).uploadUrl,
      )

      // Delete the receipts → cascade removes their expenses, uploads, history.
      await tx
        .delete(schema.receipts)
        .where(inArray(schema.receipts.id, receiptIds))
    }

    // Delete standalone expenses (no receipt to cascade through).
    if (standaloneIds.length > 0) {
      await tx
        .delete(schema.expenses)
        .where(inArray(schema.expenses.id, standaloneIds))
    }

    return {
      deletedIds: owned.map(e => e.id),
      blobDeleteUrls,
    }
  })
}
