import { z } from 'zod'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('receipt')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const receiptId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { receiptId })

  const result = await readValidatedBody(event, body => zodSchemas.receiptInputSchema.safeParse(body))

  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error),
    }
  }

  // Separate LLM metadata from receipt data
  const { llm, ...receiptData } = result.data

  const updates = {
    ...receiptData,
    updatedAt: new Date(),
  }

  const after = await db.transaction(async (tx) => {
    // Lock + read current state
    const [before] = await tx
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId))
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
    await historyUtils.trackChanges(tx, {
      historyTable: schema.receiptHistory,
      entityId: receiptId,
      entityIdColumn: 'receiptId',
      source: event.context.securityPrincipal,
      sourceVersion: llm?.sourceVersion ?? null,
    }, before, updated)

    return updated
  })

  log.info({ receiptId }, 'Updated receipt')

  return {
    success: true,
    updated: after,
  }
})
