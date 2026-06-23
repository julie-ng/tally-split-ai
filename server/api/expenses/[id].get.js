import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const expenseId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { expenseId })

  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.id, expenseId),
    with: {
      receipt: true,
    },
  })

  if (!expense) {
    throw createError({
      statusCode: 404,
      message: `Expense with ID '${expenseId}' not found`,
    })
  }

  return expense
})
