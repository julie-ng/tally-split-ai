import { describe, it, expect } from 'vitest'
import { checkTaskSplitScope } from './check-task-split-scope.js'

describe('checkTaskSplitScope', () => {
  it('should fail when no linkedReceiptId', () => {
    expect(checkTaskSplitScope(10, {
      linkedReceiptId: null,
    })).toEqual({ ok: false, reason: 'no_receipt_for_split_check' })
  })

  it('should pass when splitId matches the split linked to the receipt', () => {
    expect(checkTaskSplitScope(10, {
      linkedReceiptId: 5,
      receiptSplitId: 10,
    })).toEqual({ ok: true })
  })

  it('should fail when splitId does not match the split linked to the receipt', () => {
    expect(checkTaskSplitScope(10, {
      linkedReceiptId: 5,
      receiptSplitId: 20,
    })).toEqual({ ok: false, reason: 'split_scope_mismatch' })
  })

  describe('first-time linking (no receiptSplitId)', () => {
    it('should pass when split belongs to same household as upload', () => {
      expect(checkTaskSplitScope(10, {
        linkedReceiptId: 5,
        receiptSplitId: null,
        splitHouseholdId: 'household-1',
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: true })
    })

    it('should fail when split belongs to different household', () => {
      expect(checkTaskSplitScope(10, {
        linkedReceiptId: 5,
        receiptSplitId: null,
        splitHouseholdId: 'household-2',
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: false, reason: 'split_household_mismatch' })
    })

    it('should fail when splitHouseholdId is null', () => {
      expect(checkTaskSplitScope(10, {
        linkedReceiptId: 5,
        receiptSplitId: null,
        splitHouseholdId: null,
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: false, reason: 'split_household_mismatch' })
    })
  })
})
