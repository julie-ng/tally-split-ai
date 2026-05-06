import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)

  const receiptId = getRouterParam(event, 'id')

  // Verify household membership on the parent receipt before returning the split
  await guards.requireAuthorization(event, { receiptId })

  const split = await db.query.splits.findFirst({
    where: eq(schema.splits.receiptId, receiptId),
  })

  if (!split) {
    throw createError({ statusCode: 404, message: 'Split not found for receipt' })
  }

  return split
})
