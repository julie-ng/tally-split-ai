import { eq } from 'drizzle-orm'

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
