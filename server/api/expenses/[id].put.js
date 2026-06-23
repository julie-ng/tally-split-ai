import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { expenseUpdateSchema } from '#shared/utils/zod-schemas/expense.schema.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const expenseId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { expenseId })

  const result = await readValidatedBody(event, body => expenseUpdateSchema.safeParse(body))

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

  await db.transaction(async (tx) => {
    // Lock + read current state
    const [before] = await tx
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.id, expenseId))
      .for('update')

    if (!before) {
      throw createError({
        statusCode: 404,
        message: `Expense with ID '${expenseId}' not found`,
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
          message: 'Cannot settle an expense without identifying who paid',
        })
      }
    }

    // Apply update
    const [updated] = await tx
      .update(schema.expenses)
      .set(updates)
      .where(eq(schema.expenses.id, expenseId))
      .returning()

    // Track history
    await historyUtils.trackChanges(tx, {
      historyTable: schema.expenseHistory,
      entityId: expenseId,
      entityIdColumn: 'expenseId',
      source: event.context.securityPrincipal,
      sourceVersion: llm?.sourceVersion ?? null,
      confidence: llm?.confidence ?? null,
      reasoning: llm?.reasoning ?? null,
      fieldConfidence: llm?.fieldConfidence ?? null,
    }, before, updated)
  })

  log.info({ expenseId }, 'Updated expense')

  // Acknowledgment only — do not return the row. A write-scoped token must not
  // gain an incidental read of the full split. The client re-fetches.
  return { success: true }
})
