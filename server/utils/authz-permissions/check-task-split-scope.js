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
