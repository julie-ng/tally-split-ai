/**
 * Check if a task can access a split.
 * Handles both known-link (exact match) and first-time-linking (owner check) cases.
 *
 * @param {number} requestedSplitId - splitId from the request
 * @param {Object} context
 * @param {number|null} context.linkedReceiptId - receiptId from the workflow chain
 * @param {number|null} context.receiptSplitId - splitId currently on the receipt
 * @param {string|null} context.splitUserId - userId on the split record (for first-time linking)
 * @param {string|null} context.uploadUserId - userId on the workflow run's upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskSplitScope (requestedSplitId, { linkedReceiptId, receiptSplitId, splitUserId, uploadUserId }) {
  if (!linkedReceiptId) {
    return { ok: false, reason: 'no_receipt_for_split_check' }
  }

  if (receiptSplitId) {
    if (receiptSplitId !== requestedSplitId) {
      return { ok: false, reason: 'split_scope_mismatch' }
    }
    return { ok: true }
  }

  if (!splitUserId || splitUserId !== uploadUserId) {
    return { ok: false, reason: 'split_owner_mismatch' }
  }
  return { ok: true }
}
