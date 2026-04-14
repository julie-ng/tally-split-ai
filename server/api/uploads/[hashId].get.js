import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireHashIdParam(event)

  const hashId = getRouterParam(event, 'hashId')
  await guards.requireAuthorization(event, { uploadHashId: hashId })

  // Query for the specific upload with receipt relation
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
    with: {
      receipt: true,
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
