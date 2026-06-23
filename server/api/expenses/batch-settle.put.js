import { eq, and, isNotNull, inArray } from 'drizzle-orm'
import { z } from 'zod'

const batchSettleSchema = z.object({
  expenseIds: z.array(z.string()).min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('expense')
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const result = await readValidatedBody(event, body => batchSettleSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: result.error.flatten().fieldErrors,
    }
  }

  const { expenseIds } = result.data

  try {
    const updated = await db.transaction(async (tx) => {
      // Lock + read full rows scoped to caller's household; require paidBy and not-yet-settled.
      // The household join silently drops any IDs the caller doesn't own.
      const beforeRows = await tx
        .select({ expense: schema.expenses })
        .from(schema.expenses)
        .innerJoin(schema.receipts, eq(schema.expenses.receiptId, schema.receipts.id))
        .where(
          and(
            eq(schema.receipts.householdId, householdId),
            eq(schema.expenses.isSettled, false),
            isNotNull(schema.expenses.paidByUserId),
            inArray(schema.expenses.id, expenseIds),
          ),
        )
        .for('update')

      if (beforeRows.length === 0) return []

      const targetIds = beforeRows.map(r => r.expense.id)

      const afterRows = await tx
        .update(schema.expenses)
        .set({
          isSettled: true,
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(schema.expenses.id, targetIds))
        .returning()

      const afterById = Object.fromEntries(afterRows.map(r => [r.id, r]))
      const entities = beforeRows.map(r => ({
        entityId: r.expense.id,
        before: r.expense,
        after: afterById[r.expense.id],
      }))

      await historyUtils.trackBatchChanges(tx, {
        historyTable: schema.expenseHistory,
        entityIdColumn: 'expenseId',
        source: event.context.securityPrincipal,
      }, entities)

      return afterRows
    })

    log.info({ requested: expenseIds.length, settled: updated.length }, 'Batch settled')

    return {
      success: true,
      updatedCount: updated.length,
      settledIds: updated.map(r => r.id),
      message: `Successfully marked ${updated.length} expense(s) as settled`,
    }
  }
  catch (err) {
    log.error({ requested: expenseIds.length, err }, 'Failed to batch settle')
    throw createError({
      statusCode: 500,
      message: 'Failed to mark expenses as settled',
      data: err.message,
    })
  }
})
