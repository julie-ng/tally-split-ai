import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Receipt ID is required'
    })
  }

  const receiptId = parseInt(id, 10)
  if (isNaN(receiptId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid receipt ID. Must be a number'
    })
  }

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
