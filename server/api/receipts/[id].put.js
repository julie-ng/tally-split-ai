import { z } from 'zod'
import { db, schema } from 'hub:db'
import { eq, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const receiptId = parseInt(getRouterParam(event, 'id'), 10)

  const rawBody = await readBody(event)
  console.log('🎛️ PUT/receipts/[id]/ - RAW Request Body:', rawBody)

  const result = await readValidatedBody(event, body => zodSchemas.receiptInputSchema.safeParse(body))
  console.log('🎛️ PUT/receipts/[id]/ - Validated Request Body (result):', result)

  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error), // returns flattened errors
    }
  }

  const updates = {
    ...result.data,
    updatedAt: sql`(unixepoch())`,
  }

  // Update the record (filtering by both id and userId for security)
  const dbResult = await db
    .update(schema.receipts)
    .set(updates)
    .where(and(
      eq(schema.receipts.id, receiptId),
      eq(schema.receipts.userId, userId),
    ))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Receipt with ID '${receiptId}' not found`,
    })
  }

  return {
    success: true,
    updated: dbResult[0],
  }
})
