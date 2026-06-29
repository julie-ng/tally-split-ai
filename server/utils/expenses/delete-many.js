import { eq, and, inArray } from 'drizzle-orm'

/**
 * Batch delete expenses, scoped to a household.
 *
 * Mirrors the single-row delete (server/api/expenses/[id].delete.js): relies on
 * the FK cascade to remove expenseHistory rows, and tracks no audit trail (a
 * delete-history row would be cascaded away with the expense anyway).
 *
 * Scoped by expenses.householdId directly (NOT a receipt join): expenses carry
 * householdId as a write-once column precisely so standalone expenses
 * (receiptId null) are still reachable — joining through receipts would silently
 * skip them. Any ids the caller doesn't own are dropped (never throws).
 *
 * @param {object} db - Drizzle db (or tx)
 * @param {object} opts
 * @param {string} opts.householdId
 * @param {string[]} opts.ids
 * @returns {Promise<object[]>} the deleted rows (empty if none owned)
 */
export async function deleteMany (db, { householdId, ids }) {
  // Household scope goes straight into the DELETE — no join, so no separate
  // scoping query is needed. FK cascade removes expenseHistory rows.
  return db
    .delete(schema.expenses)
    .where(
      and(
        eq(schema.expenses.householdId, householdId),
        inArray(schema.expenses.id, ids),
      ),
    )
    .returning()
}
