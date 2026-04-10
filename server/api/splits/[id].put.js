import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { splitUpdateSchema } from '~~/shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
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

  const after = await db.transaction(async (tx) => {
    // Lock + read current state
    const [before] = await tx
      .select()
      .from(schema.splits)
      .where(and(
        eq(schema.splits.id, splitId),
        eq(schema.splits.userId, userId),
      ))
      .for('update')

    if (!before) {
      throw createError({
        statusCode: 404,
        message: `Split with ID '${splitId}' not found`,
      })
    }

    // Apply update
    const [updated] = await tx
      .update(schema.splits)
      .set(updates)
      .where(eq(schema.splits.id, splitId))
      .returning()

    // Track history
    await trackChanges(tx, {
      historyTable: schema.splitHistory,
      entityId: splitId,
      entityIdColumn: 'splitId',
      source: `user:${userId}`,
    }, before, updated)

    return updated
  })

  log.info({ splitId }, 'Updated split')

  return {
    success: true,
    updated: after,
  }
})
