import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // ⚠️ TODO - implement security.
  requireUserId(event)
  const userId = event.context.userId
  const hashId = getRouterParam(event, 'hashId')

  if (!hashId) {
    throw createError({
      statusCode: 400,
      message: 'Hash ID is required'
    })
  }

  // Query for the specific upload
  const uploads = await db.select()
    .from(schema.uploads)
    .where(
      and(
        eq(schema.uploads.hashId, hashId),
        eq(schema.uploads.userId, userId)
      )
    )
    .limit(1)

  // Check if upload exists
  if (!uploads || uploads.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Upload not found with hash ID: ${hashId}`
    })
  }

  return uploads[0]
})
