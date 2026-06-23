import { eq, and, inArray } from 'drizzle-orm'
import { summarizeExpenses } from '#shared/utils/expenses/expense-summary.utils.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  // Get optional year/month filter from query params
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  // filter expenses for this household via the linked receipt
  const queryOptions = {
    where: and(
      inArray(
        schema.expenses.receiptId,
        db.select({ id: schema.receipts.id })
          .from(schema.receipts)
          .where(eq(schema.receipts.householdId, householdId)),
      ),
      eq(schema.expenses.isSettled, false),
    ),
  }

  if (year && month) {
    queryOptions.with = {
      receipt: { columns: { date: true } },
    }
  }

  const expenses = await db.query.expenses.findMany(queryOptions)

  let filteredExpenses = expenses
  if (year && month) {
    filteredExpenses = expenses.filter((expense) => {
      if (!expense.receipt?.date) return false
      const date = new Date(expense.receipt.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  }

  return summarizeExpenses(filteredExpenses)
})
