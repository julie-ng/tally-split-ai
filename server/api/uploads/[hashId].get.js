import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireHashIdParam(event)

  const userId = event.context.userId
  const hashId = getRouterParam(event, 'hashId')

  // Query for the specific upload with receipt relation
  const upload = await db.query.uploads.findFirst({
    where: and(
      eq(schema.uploads.hashId, hashId),
      eq(schema.uploads.userId, userId)
    ),
    with: {
      receipt: true
    }
  })

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload not found with hash ID: ${hashId}`
    })
  }

  return upload
})
