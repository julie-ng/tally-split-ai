import { eq } from 'drizzle-orm'
import { toBerlinISODate } from '#shared/utils/expense-date.utils.js'

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
          merchantAddress: true,
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
    // expense.date is a UTC instant; bucket by its Berlin calendar month.
    const target = `${year}-${String(month).padStart(2, '0')}`
    return expenses.filter((expense) => {
      const berlinDay = toBerlinISODate(expense.date)
      return berlinDay?.slice(0, 7) === target
    })
  }

  return expenses
})
