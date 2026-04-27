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
    it('should pass when receipt belongs to same household as upload', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptHouseholdId: 'household-1',
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: true })
    })

    it('should fail when receipt belongs to different household', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptHouseholdId: 'household-2',
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: false, reason: 'receipt_household_mismatch' })
    })

    it('should fail when receiptHouseholdId is null', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptHouseholdId: null,
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: false, reason: 'receipt_household_mismatch' })
    })

    it('should fail when uploadHouseholdId is null', () => {
      expect(checkTaskReceiptScope(5, {
        expectedReceiptId: null,
        receiptHouseholdId: 'household-1',
        uploadHouseholdId: null,
      })).toEqual({ ok: false, reason: 'receipt_household_mismatch' })
    })
  })
})
