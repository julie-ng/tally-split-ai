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
