/**
 * Check if a task can access a split.
 * Handles both known-link (exact match) and first-time-linking (household match) cases.
 *
 * NOTE: splits do not carry a householdId column. For the first-time-linking
 * branch, the caller must derive `splitHouseholdId` by joining splits → receipts.
 *
 * @param {number} requestedSplitId - splitId from the request
 * @param {Object} context
 * @param {number|null} context.linkedReceiptId - receiptId from the workflow chain
 * @param {number|null} context.receiptSplitId - splitId linked to the receipt (derived from splits table)
 * @param {string|null} context.splitHouseholdId - householdId derived for the split (for first-time linking)
 * @param {string|null} context.uploadHouseholdId - householdId on the workflow run's upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskSplitScope (requestedSplitId, { linkedReceiptId, receiptSplitId, splitHouseholdId, uploadHouseholdId }) {
  if (!linkedReceiptId) {
    return { ok: false, reason: 'no_receipt_for_split_check' }
  }

  if (receiptSplitId) {
    if (receiptSplitId !== requestedSplitId) {
      return { ok: false, reason: 'split_scope_mismatch' }
    }
    return { ok: true }
  }

  if (!splitHouseholdId || splitHouseholdId !== uploadHouseholdId) {
    return { ok: false, reason: 'split_household_mismatch' }
  }
  return { ok: true }
}
