import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
  await requireAuthentication(event)
  requireIdParam(event)

  const receiptId = parseInt(getRouterParam(event, 'id'), 10)
  await requireAuthorization(event, { receiptId })

  // Fetch receipt for history tracking
  const receipt = await db
    .select()
    .from(schema.receipts)
    .where(eq(schema.receipts.id, receiptId))
    .limit(1)

  if (receipt.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`,
    })
  }

  // Track deletion history before deleting
  await historyUtils.trackDelete(db, {
    historyTable: schema.receiptHistory,
    entityId: receiptId,
    entityIdColumn: 'receiptId',
    source: event.context.securityPrincipal,
  }, receipt[0])

  // Delete associated uploads first
  await db
    .delete(schema.uploads)
    .where(eq(schema.uploads.receiptId, receiptId))

  // Now delete the receipt
  const result = await db
    .delete(schema.receipts)
    .where(eq(schema.receipts.id, receiptId))
    .returning()

  log.info({ receiptId }, 'Receipt deleted')

  return {
    success: true,
    deleted: result[0],
  }
})
