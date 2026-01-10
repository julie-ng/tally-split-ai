import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const receiptId = parseInt(getRouterParam(event, 'id'), 10)

  const receipt = await db.query.receipts.findFirst({
    where: and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId)
    ),
    with: {
      uploads: true
    }
  })

  if (!receipt) {
    throw createError({
      statusCode: 404,
      message: `Receipt not found with ID: ${receiptId}`
    })
  }

  return receipt
})
