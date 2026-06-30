import { eq, and } from 'drizzle-orm'
import { summarizeExpenses } from '#shared/utils/expenses/expense-summary.utils.js'
import { toBerlinISODate } from '#shared/utils/expense-date.utils.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  // Get optional year/month filter from query params
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  // Scope by expenses.householdId DIRECTLY — NOT via a receipt join. Standalone
  // expenses have receiptId = null; an inArray(receiptId, household receipts)
  // filter silently drops them from the summary while the table (which scopes by
  // householdId) still shows them, so the cards undercount. See the same fix in
  // server/utils/expenses/set-settled.js and delete-many.js.
  const expenses = await db.query.expenses.findMany({
    where: and(
      eq(schema.expenses.householdId, householdId),
      eq(schema.expenses.isSettled, false),
    ),
  })

  let filteredExpenses = expenses
  if (year && month) {
    // Bucket by expense.date (Berlin calendar day), exactly like the table's
    // getExpensesByMonth — NOT by receipt.date, which standalone expenses lack.
    const target = `${year}-${String(month).padStart(2, '0')}`
    filteredExpenses = expenses.filter((expense) => {
      const berlinMonth = toBerlinISODate(expense.date)?.slice(0, 7) // "YYYY-MM" or undefined
      return berlinMonth === target
    })
  }

  return summarizeExpenses(filteredExpenses)
})
