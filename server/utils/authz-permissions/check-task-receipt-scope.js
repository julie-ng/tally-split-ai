/**
 * Check if a task can access a receipt.
 * Handles both known-link (exact match) and first-time-linking (household match) cases.
 *
 * @param {number} requestedReceiptId - receiptId from the request
 * @param {Object} context
 * @param {number|null} context.expectedReceiptId - upload.receiptId
 * @param {string|null} context.receiptHouseholdId - householdId on the receipt record (for first-time linking)
 * @param {string|null} context.uploadHouseholdId - householdId on the workflow run's upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskReceiptScope (requestedReceiptId, { expectedReceiptId, receiptHouseholdId, uploadHouseholdId }) {
  if (expectedReceiptId) {
    if (requestedReceiptId !== expectedReceiptId) {
      return { ok: false, reason: 'receipt_scope_mismatch' }
    }
    return { ok: true }
  }

  if (!receiptHouseholdId || receiptHouseholdId !== uploadHouseholdId) {
    return { ok: false, reason: 'receipt_household_mismatch' }
  }
  return { ok: true }
}
