import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const id = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { uploadId: id })

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.id, id),
    columns: { ocrJson: true, ocrText: true },
  })

  if (!upload) {
    throw createError({ statusCode: 404, message: 'Upload not found' })
  }

  if (!upload.ocrJson) {
    throw createError({ statusCode: 404, message: 'No OCR data available' })
  }

  return {
    ocrText: upload.ocrText,
    ocrJson: upload.ocrJson,
  }
})
