/**
 * Pure authorization check functions — no DB, no auto-imports, fully testable.
 * Each returns { ok: true } or { ok: false, reason, details }.
 *
 * The caller (require-authorization.js) handles DB queries, security logging, and error throwing.
 */

/**
 * Check if a user owns a resource.
 * @param {string|null} resourceUserId - userId on the resource record
 * @param {string} expectedUserId - authenticated user's ID
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkUserOwnership (resourceUserId, expectedUserId) {
  if (!resourceUserId || resourceUserId !== expectedUserId) {
    return { ok: false, reason: 'not_owned' }
  }
  return { ok: true }
}

/**
 * Check if a task can access an upload by hashId.
 * @param {string} requestedHashId - hashId from the request
 * @param {string|null} workflowUploadHashId - hashId from workflowRun.upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskUploadScope (requestedHashId, workflowUploadHashId) {
  if (!workflowUploadHashId || requestedHashId !== workflowUploadHashId) {
    return { ok: false, reason: 'upload_scope_mismatch' }
  }
  return { ok: true }
}

/**
 * Check if a task can access a receipt.
 * Handles both known-link (exact match) and first-time-linking (owner check) cases.
 *
 * @param {number} requestedReceiptId - receiptId from the request
 * @param {Object} context
 * @param {number|null} context.expectedReceiptId - upload.receiptId or workflowRun.receiptId
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

  // First-time linking — verify receipt belongs to same user as upload
  if (!receiptUserId || receiptUserId !== uploadUserId) {
    return { ok: false, reason: 'receipt_owner_mismatch' }
  }
  return { ok: true }
}

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

  // First-time linking — verify split belongs to same user
  if (!splitUserId || splitUserId !== uploadUserId) {
    return { ok: false, reason: 'split_owner_mismatch' }
  }
  return { ok: true }
}
