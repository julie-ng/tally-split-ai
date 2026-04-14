import { describe, it, expect } from 'vitest'
import { checkTaskSplitScope } from './check-task-split-scope.js'

describe('checkTaskSplitScope', () => {
  it('should fail when no linkedReceiptId', () => {
    expect(checkTaskSplitScope(10, {
      linkedReceiptId: null,
    })).toEqual({ ok: false, reason: 'no_receipt_for_split_check' })
  })

  it('should pass when splitId matches receipt.splitId', () => {
    expect(checkTaskSplitScope(10, {
      linkedReceiptId: 5,
      receiptSplitId: 10,
    })).toEqual({ ok: true })
  })

  it('should fail when splitId does not match receipt.splitId', () => {
    expect(checkTaskSplitScope(10, {
      linkedReceiptId: 5,
      receiptSplitId: 20,
    })).toEqual({ ok: false, reason: 'split_scope_mismatch' })
  })

  describe('first-time linking (no receiptSplitId)', () => {
    it('should pass when split belongs to same user as upload', () => {
      expect(checkTaskSplitScope(10, {
        linkedReceiptId: 5,
        receiptSplitId: null,
        splitUserId: 'user-1',
        uploadUserId: 'user-1',
      })).toEqual({ ok: true })
    })

    it('should fail when split belongs to different user', () => {
      expect(checkTaskSplitScope(10, {
        linkedReceiptId: 5,
        receiptSplitId: null,
        splitUserId: 'user-2',
        uploadUserId: 'user-1',
      })).toEqual({ ok: false, reason: 'split_owner_mismatch' })
    })

    it('should fail when splitUserId is null', () => {
      expect(checkTaskSplitScope(10, {
        linkedReceiptId: 5,
        receiptSplitId: null,
        splitUserId: null,
        uploadUserId: 'user-1',
      })).toEqual({ ok: false, reason: 'split_owner_mismatch' })
    })
  })
})
