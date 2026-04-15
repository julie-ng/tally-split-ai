import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  const receiptId = parseInt(getRouterParam(event, 'id'), 10)

  const split = await db.query.splits.findFirst({
    where: and(
      eq(schema.splits.userId, userId),
      eq(schema.splits.receiptId, receiptId),
    ),
  })

  if (!split) {
    throw createError({ statusCode: 404, message: 'Split not found for receipt' })
  }

  return split
})
