import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { splitUpdateSchema } from '~~/shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const splitId = parseInt(getRouterParam(event, 'id'), 10)

  const result = await readValidatedBody(event, body => splitUpdateSchema.safeParse(body))

  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const updates = {
    ...result.data,
    updatedAt: new Date(),
  }

  // Set settledAt timestamp when marking as settled
  if (result.data.isSettled === true) {
    updates.settledAt = new Date()
  }
  else if (result.data.isSettled === false) {
    updates.settledAt = null
  }

  const dbResult = await db
    .update(schema.splits)
    .set(updates)
    .where(and(
      eq(schema.splits.id, splitId),
      eq(schema.splits.userId, userId),
    ))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Split with ID '${splitId}' not found`,
    })
  }

  return {
    success: true,
    updated: dbResult[0],
  }
})
