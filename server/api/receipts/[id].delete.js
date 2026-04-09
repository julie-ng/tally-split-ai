import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const receiptId = parseInt(getRouterParam(event, 'id'), 10)

  // First, check if receipt exists and belongs to user
  const receipt = await db
    .select()
    .from(schema.receipts)
    .where(and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId),
    ))
    .limit(1)

  if (receipt.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`,
    })
  }

  // Manually delete associated uploads first
  // (SQLite cascade delete may not be enabled at runtime)
  await db
    .delete(schema.uploads)
    .where(eq(schema.uploads.receiptId, receiptId))

  // Now delete the receipt
  const result = await db
    .delete(schema.receipts)
    .where(and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId),
    ))
    .returning()

  log.info({ receiptId }, 'Receipt deleted')

  return {
    success: true,
    deleted: result[0],
  }
})
