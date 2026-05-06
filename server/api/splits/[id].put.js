import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { splitUpdateSchema } from '#shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const splitId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { splitId })

  const result = await readValidatedBody(event, body => splitUpdateSchema.safeParse(body))

  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // Separate LLM metadata from split data
  const { llm, ...splitData } = result.data

  const updates = {
    ...splitData,
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
      .where(eq(schema.splits.id, splitId))
      .for('update')

    if (!before) {
      throw createError({
        statusCode: 404,
        message: `Split with ID '${splitId}' not found`,
      })
    }

    // Settling requires a known payer. Enforce post-update state — payer can be
    // set in the same request as isSettled=true. Defense-in-depth alongside UI
    // disabling the settle action when paidByUserId is null.
    if (result.data.isSettled === true) {
      const nextPaidByUserId = 'paidByUserId' in updates ? updates.paidByUserId : before.paidByUserId
      if (!nextPaidByUserId) {
        throw createError({
          statusCode: 400,
          message: 'Cannot settle a split without identifying who paid',
        })
      }
    }

    // Apply update
    const [updated] = await tx
      .update(schema.splits)
      .set(updates)
      .where(eq(schema.splits.id, splitId))
      .returning()

    // Track history
    await historyUtils.trackChanges(tx, {
      historyTable: schema.splitHistory,
      entityId: splitId,
      entityIdColumn: 'splitId',
      source: event.context.securityPrincipal,
      sourceVersion: llm?.sourceVersion ?? null,
      confidence: llm?.confidence ?? null,
      reasoning: llm?.reasoning ?? null,
      fieldConfidence: llm?.fieldConfidence ?? null,
    }, before, updated)

    return updated
  })

  log.info({ splitId }, 'Updated split')

  return {
    success: true,
    updated: after,
  }
})
