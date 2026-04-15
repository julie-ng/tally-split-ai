/**
 * Check if a task can access a receipt.
 * Handles both known-link (exact match) and first-time-linking (owner check) cases.
 *
 * @param {number} requestedReceiptId - receiptId from the request
 * @param {Object} context
 * @param {number|null} context.expectedReceiptId - upload.receiptId
 * @param {string|null} context.receiptUserId - userId on the receipt record (for first-time linking)
 * @param {string|null} context.uploadUserId - userId on the workflow run's upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskReceiptScope (requestedReceiptId, { expectedReceiptId, receiptUserId, uploadUserId }) {
  if (expectedReceiptId) {
    if (requestedReceiptId !== expectedReceiptId) {
      return { ok: false, reason: 'receipt_scope_mismatch' }
    }
    return { ok: true }
  }

  if (!receiptUserId || receiptUserId !== uploadUserId) {
    return { ok: false, reason: 'receipt_owner_mismatch' }
  }
  return { ok: true }
}
