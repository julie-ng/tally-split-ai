import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireHashIdParam(event)

  const hashId = getRouterParam(event, 'hashId')
  await guards.requireAuthorization(event, { uploadHashId: hashId })

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
    columns: { ocrJson: true },
  })

  if (!upload) {
    throw createError({ statusCode: 404, message: 'Upload not found' })
  }

  if (!upload.ocrJson) {
    throw createError({ statusCode: 404, message: 'No OCR data available' })
  }

  return upload.ocrJson
})
