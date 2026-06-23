import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const expenseId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { expenseId })

  // FK cascade removes split history rows.
  const dbResult = await db
    .delete(schema.expenses)
    .where(eq(schema.expenses.id, expenseId))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Expense with ID '${expenseId}' not found`,
    })
  }

  log.info({ expenseId }, 'Expense deleted (history cascaded)')

  return {
    success: true,
    deleted: dbResult[0],
  }
})
