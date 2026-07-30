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
    with: {
      upload: {
        columns: {
          ocrJson: false,
          annotationsJson: false,
        },
      },
    },
  })

  if (!receipt) {
    throw createError({
      statusCode: 404,
      message: `Receipt not found with ID: ${receiptId}`,
    })
  }

  // TRANSITIONAL: returns BOTH `uploadId` and the embedded `upload`.
  // Remove `keepUpload` — and the `columns` filter above — once the
  // design-direction UI lands: the receipt tab's leaves will resolve the upload
  // from the uploads store by id instead of reading it off the receipt.
  return receiptsUtils.withUploadId(receipt, { keepUpload: true })
})
