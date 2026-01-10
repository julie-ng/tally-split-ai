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

  // Delete the record (filtering by both id and userId for security)
  // Note: Associated uploads will be cascade deleted per schema definition
  const result = await db
    .delete(schema.receipts)
    .where(and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId)
    ))
    .returning()

  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`
    })
  }

  return {
    success: true,
    deleted: result[0]
  }
})
