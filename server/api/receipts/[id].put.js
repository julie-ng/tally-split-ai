import { z } from 'zod'
import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const receiptId = parseInt(getRouterParam(event, 'id'), 10)

  const result = await readValidatedBody(event, body => zodSchemas.receiptInputSchema.safeParse(body))
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

  // Update the record (filtering by both id and userId for security)
  const dbResult = await db
    .update(schema.receipts)
    .set(updates)
    .where(and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId)
    ))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`
    })
  }

  return {
    success: true,
    updated: dbResult[0]
  }
})
