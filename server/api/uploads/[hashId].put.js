import { z } from 'zod'
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireHashIdParam(event)

  const hashId = getRouterParam(event, 'hashId')

  const result = await readValidatedBody(event, body => zodSchemas.uploadUpdateSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors
    }
  }

  const updates = {
    ...result.data,
    updatedAt: sql`(unixepoch())`
  }

  const dbResult = await db
    .update(schema.uploads)
    .set(updates)
    .where(eq(schema.uploads.hashId, hashId))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Upload with hashId '${hashId}' not found`
    })
  }

  return {
    success: true,
    updated: dbResult[0]
  }
})
