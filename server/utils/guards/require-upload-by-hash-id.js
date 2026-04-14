import { eq } from 'drizzle-orm'

/**
 * Fetches an upload by hashId route parameter and throws 404 if not found.
 * Stores the upload on `event.context.upload` for downstream use.
 * Throws 404 if not found.
 *
 * TODO: Also verify upload belongs to the authenticated user (event.context.userId)
 *
 * @param {H3Event} event
 * @param {string} paramName - Route parameter name (default: 'uploadHashId')
 */
export async function requireUploadByHashId (event, paramName = 'uploadHashId') {
  const db = useDB()
  const hashId = getRouterParam(event, paramName)

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
  })

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload not found with hash ID: ${hashId}`,
    })
  }

  event.context.upload = upload
}
