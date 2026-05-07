import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const receiptId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { receiptId })

  // FK cascade removes splits, uploads, and history rows in one statement.
  const result = await db
    .delete(schema.receipts)
    .where(eq(schema.receipts.id, receiptId))
    .returning()

  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`,
    })
  }

  log.info({ receiptId }, 'Receipt deleted (splits, uploads, history cascaded)')

  return {
    success: true,
    deleted: result[0],
  }
})
