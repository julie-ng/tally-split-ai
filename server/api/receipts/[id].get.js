import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const receiptId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { receiptId })

  const receipt = await db.query.receipts.findFirst({
    where: eq(schema.receipts.id, receiptId),
    extras: receiptsUtils.withUploadId,
  })

  if (!receipt) {
    throw createError({
      statusCode: 404,
      message: `Receipt not found with ID: ${receiptId}`,
    })
  }

  return receipt
})
