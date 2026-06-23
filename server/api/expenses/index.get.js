import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  const expenses = await db.query.expenses.findMany({
    where: eq(schema.expenses.householdId, householdId),
    with: {
      receipt: {
        columns: {
          id: true,
          title: true,
          merchantName: true,
          date: true,
        },
        with: {
          uploads: {
            columns: {
              analysisStatus: true,
              originalFilename: true,
            },
          },
        },
      },
    },
  })

  if (year && month) {
    return expenses.filter((expense) => {
      if (!expense.receipt?.date) return false
      const date = new Date(expense.receipt.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  }

  return expenses
})
