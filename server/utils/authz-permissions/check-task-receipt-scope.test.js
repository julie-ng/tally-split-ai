import { describe, it, expect } from 'vitest'
import { checkTaskReceiptScope } from './check-task-receipt-scope.js'

describe('checkTaskReceiptScope', () => {
  it('should pass when receiptId matches expected', () => {
    expect(checkTaskReceiptScope(5, { expectedReceiptId: 5 })).toEqual({ ok: true })
  })

  it('should fail when receiptId does not match expected', () => {
    expect(checkTaskReceiptScope(5, { expectedReceiptId: 10 })).toEqual({ ok: false, reason: 'receipt_scope_mismatch' })
  })

  describe('first-time linking (no expectedReceiptId)', () => {
    it('should pass when receipt belongs to same user as upload', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptUserId: 'user-1',
        uploadUserId: 'user-1',
      })).toEqual({ ok: true })
    })

    it('should fail when receipt belongs to different user', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptUserId: 'user-2',
        uploadUserId: 'user-1',
      })).toEqual({ ok: false, reason: 'receipt_owner_mismatch' })
    })

    it('should fail when receiptUserId is null', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptUserId: null,
        uploadUserId: 'user-1',
      })).toEqual({ ok: false, reason: 'receipt_owner_mismatch' })
    })

    it('should fail when uploadUserId is null', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptUserId: 'user-1',
        uploadUserId: null,
      })).toEqual({ ok: false, reason: 'receipt_owner_mismatch' })
    })
  })
})
