import { z } from 'zod'
import { db, schema } from 'hub:db'
import { eq, and, sql } from 'drizzle-orm'
import { splitUpdateSchema } from '~~/shared/utils/zod-schemas/split.schema.js'

export default defineEventHandler(async (event) => {
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

  // Fetch existing record if we need to recalculate owedAmount
  let existingSplit = null
  if (result.data.paidBy !== undefined || result.data.splitAmount !== undefined) {
    existingSplit = await db.query.splits.findFirst({
      where: and(
        eq(schema.splits.id, splitId),
        eq(schema.splits.userId, userId),
      ),
    })

    if (!existingSplit) {
      throw createError({
        statusCode: 404,
        message: `Split with ID '${splitId}' not found`,
      })
    }
  }

  const updates = {
    ...result.data,
    updatedAt: sql`(unixepoch())`,
  }

  // Recalculate owedAmount if splitAmount or paidBy changed
  if (result.data.paidBy !== undefined || result.data.splitAmount !== undefined) {
    const newPaidBy = (result.data.paidBy !== undefined)
      ? result.data.paidBy
      : existingSplit.paidBy
    const newSplitAmount = result.data.splitAmount ?? existingSplit.splitAmount

    if (newPaidBy) {
      updates.owedAmount = Math.floor(newSplitAmount / 2 * 100) / 100
    }
    else {
      updates.owedAmount = null
    }
  }

  // Set settledAt timestamp when marking as settled
  if (result.data.isSettled === true) {
    updates.settledAt = sql`(unixepoch())`
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
