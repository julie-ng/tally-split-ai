/**
 * Check if a task can access an expense.
 * Handles both known-link (exact match) and first-time-linking (household match) cases.
 *
 * For the first-time-linking branch, the caller derives `expenseHouseholdId`
 * from the expense's own householdId column.
 *
 * @param {number} requestedExpenseId - expenseId from the request
 * @param {Object} context
 * @param {number|null} context.linkedReceiptId - receiptId from the workflow chain
 * @param {number|null} context.receiptExpenseId - expenseId linked to the receipt (derived from expenses table)
 * @param {string|null} context.expenseHouseholdId - householdId on the expense (for first-time linking)
 * @param {string|null} context.uploadHouseholdId - householdId on the workflow run's upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskExpenseScope (requestedExpenseId, { linkedReceiptId, receiptExpenseId, expenseHouseholdId, uploadHouseholdId }) {
  if (!linkedReceiptId) {
    return { ok: false, reason: 'no_receipt_for_expense_check' }
  }

  if (receiptExpenseId) {
    if (receiptExpenseId !== requestedExpenseId) {
      return { ok: false, reason: 'expense_scope_mismatch' }
    }
    return { ok: true }
  }

  if (!expenseHouseholdId || expenseHouseholdId !== uploadHouseholdId) {
    return { ok: false, reason: 'expense_household_mismatch' }
  }
  return { ok: true }
}
