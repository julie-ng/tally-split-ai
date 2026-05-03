import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireHashIdParam(event)

  const hashId = getRouterParam(event, 'hashId')
  await guards.requireAuthorization(event, { uploadHashId: hashId })

  // Parse optional include param — default excludes large JSONB fields
  const query = getQuery(event)
  const includes = query.include?.split(',') ?? []

  const columns = {}
  if (!includes.includes('ocrJson')) columns.ocrJson = false
  if (!includes.includes('annotationsJson')) columns.annotationsJson = false

  // Query for the specific upload with relations.
  // Receipt is intentionally slim ({id, title}) — matches the slim list
  // endpoint shape so refreshUploadByHashId can replace list entries
  // without losing receipt data. Components that need full receipt fields
  // should fetch via the receipts store.
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
    columns: Object.keys(columns).length > 0 ? columns : undefined,
    with: {
      receipt: {
        columns: {
          id: true,
          title: true,
        },
      },
      workflowRuns: true,
    },
  })

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload not found with hash ID: ${hashId}`,
    })
  }

  // Filter out internal blob tags from azureTags
  return {
    ...upload,
    azureTags: upload.azureTags ? azureUtils.excludeInternalBlobTags(upload.azureTags) : upload.azureTags,
  }
})
