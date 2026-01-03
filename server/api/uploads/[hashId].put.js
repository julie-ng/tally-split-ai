import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // ⚠️ TODO - implement security - note: userId not mentioned anywhere below 🤔
  requireUserId(event)
  const userId = event.context.userId

  const hashId = getRouterParam(event, 'hashId')

  // Validate hashId parameter
  if (!hashId || typeof hashId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid hashId parameter'
    })
  }

  const body = await readBody(event)

  // Validate request body
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  const {
    contentType,
    size,
    status,
    uploadedAt,
    azureTags,
    title
  } = body

  // Build update object with only provided fields
  const updates = {}

  if (contentType !== undefined) {
    updates.contentType = contentType
  }

  if (title !== undefined && typeof title === 'string') {
    updates.title = title
  }

  if (size !== undefined) {
    if (typeof size !== 'number' || size < 0) {
      throw createError({
        statusCode: 400,
        message: 'Invalid size. Must be a non-negative number'
      })
    }
    updates.size = size
  }

  if (azureTags !== undefined) {
    if (typeof azureTags !== 'object' || azureTags === null) {
      throw createError({
        statusCode: 400,
        message: 'Invalid azureTags. Must be an object'
      })
    }
    updates.azureTags = JSON.stringify(azureTags)
  }

  if (status !== undefined) {
    if (typeof status !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'Invalid status. Must be a string'
      })
    }
    updates.status = status
  }

  if (uploadedAt !== undefined) {
    // If true, use current timestamp from database
    if (uploadedAt === true) {
      updates.uploadedAt = sql`(unixepoch())`
    } else if (typeof uploadedAt === 'number') {
      updates.uploadedAt = uploadedAt
    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid uploadedAt. Must be true (for current time) or a Unix timestamp'
      })
    }
  }

  // Always update the updatedAt timestamp
  updates.updatedAt = sql`(unixepoch())`

  // Check if there are any updates to make
  if (Object.keys(updates).length === 1) { // Only updatedAt
    throw createError({
      statusCode: 400,
      message: 'No valid fields to update'
    })
  }

  // Update the record
  const result = await db
    .update(schema.uploads)
    .set(updates)
    .where(eq(schema.uploads.hashId, hashId))
    .returning()

  // Check if record was found and updated
  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Upload with hashId '${hashId}' not found`
    })
  }

  return {
    success: true,
    updated: result[0]
  }
})
