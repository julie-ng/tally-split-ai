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

  // Query for the specific upload with relations.
  // Receipt projection MUST match the list endpoint (/api/uploads/index.get.js:
  // { id, title, date }) — refreshUploadById replaces the list entry with this
  // one, so any field the list carries but this omits gets wiped from the merged
  // row. (That's how the Receipt Date column flashed then blanked: date was on
  // the list row but missing here.) Keep the two in sync. Components needing
  // fuller receipt fields still fetch via the receipts store.
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.id, id),
    columns: Object.keys(columns).length > 0 ? columns : undefined,
    with: {
      receipt: {
        columns: {
          id: true,
          title: true,
          date: true,
        },
      },
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
