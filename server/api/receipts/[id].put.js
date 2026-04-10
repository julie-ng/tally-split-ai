import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
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
      errors: z.flattenError(result.error),
    }
  }

  const updates = {
    ...result.data,
    updatedAt: new Date(),
  }

  const after = await db.transaction(async (tx) => {
    // Lock + read current state
    const [before] = await tx
      .select()
      .from(schema.receipts)
      .where(and(
        eq(schema.receipts.id, receiptId),
        eq(schema.receipts.userId, userId),
      ))
      .for('update')

    if (!before) {
      throw createError({
        statusCode: 404,
        message: `Receipt with ID '${receiptId}' not found`,
      })
    }

    // Apply update
    const [updated] = await tx
      .update(schema.receipts)
      .set(updates)
      .where(eq(schema.receipts.id, receiptId))
      .returning()

    // Track history
    await trackChanges(tx, {
      historyTable: schema.receiptHistory,
      entityId: receiptId,
      entityIdColumn: 'receiptId',
      source: `user:${userId}`,
    }, before, updated)

    return updated
  })

  log.info({ receiptId }, 'Updated receipt')

  return {
    success: true,
    updated: after,
  }
})
