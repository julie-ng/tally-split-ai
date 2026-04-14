import { describe, it, expect } from 'vitest'
import {
  checkUserOwnership,
  checkTaskUploadScope,
  checkTaskReceiptScope,
  checkTaskSplitScope,
} from './authz-checks.utils.js'

describe('checkUserOwnership', () => {
  it('should pass when userId matches', () => {
    expect(checkUserOwnership('user-1', 'user-1')).toEqual({ ok: true })
  })

  it('should fail when userId does not match', () => {
    expect(checkUserOwnership('user-2', 'user-1')).toEqual({ ok: false, reason: 'not_owned' })
  })

  it('should fail when resourceUserId is null', () => {
    expect(checkUserOwnership(null, 'user-1')).toEqual({ ok: false, reason: 'not_owned' })
  })

  it('should fail when resourceUserId is undefined', () => {
    expect(checkUserOwnership(undefined, 'user-1')).toEqual({ ok: false, reason: 'not_owned' })
  })
})

describe('checkTaskUploadScope', () => {
  it('should pass when hashIds match', () => {
    expect(checkTaskUploadScope('abc123', 'abc123')).toEqual({ ok: true })
  })

  it('should fail when hashIds differ', () => {
    expect(checkTaskUploadScope('abc123', 'xyz789')).toEqual({ ok: false, reason: 'upload_scope_mismatch' })
  })

  it('should fail when workflow upload hashId is null', () => {
    expect(checkTaskUploadScope('abc123', null)).toEqual({ ok: false, reason: 'upload_scope_mismatch' })
  })
})

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
