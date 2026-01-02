import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const hashId = getRouterParam(event, 'hashId')

  // Validate hashId parameter
  if (!hashId || typeof hashId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid hashId parameter'
    })
  }

  // Delete the record
  const result = await db
    .delete(schema.uploads)
    .where(eq(schema.uploads.hashId, hashId))
    .returning()

  // Check if record was found and deleted
  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Upload with hashId '${hashId}' not found`
    })
  }

  return {
    success: true,
    deleted: result[0]
  }
})
