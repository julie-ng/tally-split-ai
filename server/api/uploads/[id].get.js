import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const id = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { uploadId: id })

  // Parse optional include param — default excludes large JSONB fields
  const query = getQuery(event)
  const includes = query.include?.split(',') ?? []

  const columns = {}
  if (!includes.includes('ocrJson')) columns.ocrJson = false
  if (!includes.includes('annotationsJson')) columns.annotationsJson = false

  // No `receipt` join — the row carries receiptId and consumers resolve the
  // receipt from the receipts store. Embedding it made fetched rows differ in
  // SHAPE from broadcast rows (a row trigger can't join), and forced this
  // projection to superset the list endpoint's or refreshUploadById would wipe
  // fields the list had (the Receipt Date column flashing then blanking).
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.id, id),
    columns: Object.keys(columns).length > 0 ? columns : undefined,
    with: {
      workflowRuns: true,
    },
  })

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload not found with id: ${id}`,
    })
  }

  return upload
})
