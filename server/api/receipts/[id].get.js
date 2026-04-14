import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const receiptId = parseInt(getRouterParam(event, 'id'), 10)
  await guards.requireAuthorization(event, { receiptId })

  const receipt = await db.query.receipts.findFirst({
    where: eq(schema.receipts.id, receiptId),
    with: {
      uploads: true,
    },
  })

  if (!receipt) {
    throw createError({
      statusCode: 404,
      message: `Receipt not found with ID: ${receiptId}`,
    })
  }

  return receipt
})
