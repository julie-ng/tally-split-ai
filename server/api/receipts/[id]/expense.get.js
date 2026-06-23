import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)

  const receiptId = getRouterParam(event, 'id')

  // Verify household membership on the parent receipt before returning the expense
  await guards.requireAuthorization(event, { receiptId })

  const expense = await db.query.expenses.findFirst({
    where: eq(schema.expenses.receiptId, receiptId),
  })

  if (!expense) {
    throw createError({ statusCode: 404, message: 'Split not found for receipt' })
  }

  return expense
})
