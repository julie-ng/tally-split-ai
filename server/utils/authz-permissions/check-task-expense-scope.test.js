import { describe, it, expect } from 'vitest'
import { checkTaskExpenseScope } from './check-task-expense-scope.js'

describe('checkTaskExpenseScope', () => {
  it('should fail when no linkedReceiptId', () => {
    expect(checkTaskExpenseScope(10, {
      linkedReceiptId: null,
    })).toEqual({ ok: false, reason: 'no_receipt_for_expense_check' })
  })

  it('should pass when expenseId matches the expense linked to the receipt', () => {
    expect(checkTaskExpenseScope(10, {
      linkedReceiptId: 5,
      receiptExpenseId: 10,
    })).toEqual({ ok: true })
  })

  it('should fail when expenseId does not match the expense linked to the receipt', () => {
    expect(checkTaskExpenseScope(10, {
      linkedReceiptId: 5,
      receiptExpenseId: 20,
    })).toEqual({ ok: false, reason: 'expense_scope_mismatch' })
  })

  describe('first-time linking (no receiptExpenseId)', () => {
    it('should pass when expense belongs to same household as upload', () => {
      expect(checkTaskExpenseScope(10, {
        linkedReceiptId: 5,
        receiptExpenseId: null,
        expenseHouseholdId: 'household-1',
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: true })
    })

    it('should fail when expense belongs to different household', () => {
      expect(checkTaskExpenseScope(10, {
        linkedReceiptId: 5,
        receiptExpenseId: null,
        expenseHouseholdId: 'household-2',
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: false, reason: 'expense_household_mismatch' })
    })

    it('should fail when expenseHouseholdId is null', () => {
      expect(checkTaskExpenseScope(10, {
        linkedReceiptId: 5,
        receiptExpenseId: null,
        expenseHouseholdId: null,
        uploadHouseholdId: 'household-1',
      })).toEqual({ ok: false, reason: 'expense_household_mismatch' })
    })
  })
})
