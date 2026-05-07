import { eq, and, isNotNull, inArray } from 'drizzle-orm'
import { z } from 'zod'

const batchSettleSchema = z.object({
  splitIds: z.array(z.string()).min(1).max(500),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
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

  const { splitIds } = result.data

  try {
    const updated = await db.transaction(async (tx) => {
      // Lock + read full rows scoped to caller's household; require paidBy and not-yet-settled.
      // The household join silently drops any IDs the caller doesn't own.
      const beforeRows = await tx
        .select({ splits: schema.splits })
        .from(schema.splits)
        .innerJoin(schema.receipts, eq(schema.splits.receiptId, schema.receipts.id))
        .where(
          and(
            eq(schema.receipts.householdId, householdId),
            eq(schema.splits.isSettled, false),
            isNotNull(schema.splits.paidByUserId),
            inArray(schema.splits.id, splitIds),
          ),
        )
        .for('update')

      if (beforeRows.length === 0) return []

      const targetIds = beforeRows.map(r => r.splits.id)

      const afterRows = await tx
        .update(schema.splits)
        .set({
          isSettled: true,
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(inArray(schema.splits.id, targetIds))
        .returning()

      const afterById = Object.fromEntries(afterRows.map(r => [r.id, r]))
      const entities = beforeRows.map(r => ({
        entityId: r.splits.id,
        before: r.splits,
        after: afterById[r.splits.id],
      }))

      await historyUtils.trackBatchChanges(tx, {
        historyTable: schema.splitHistory,
        entityIdColumn: 'splitId',
        source: event.context.securityPrincipal,
      }, entities)

      return afterRows
    })

    log.info({ requested: splitIds.length, settled: updated.length }, 'Batch settled')

    return {
      success: true,
      updatedCount: updated.length,
      settledIds: updated.map(r => r.id),
      message: `Successfully marked ${updated.length} split(s) as settled`,
    }
  }
  catch (err) {
    log.error({ requested: splitIds.length, err }, 'Failed to batch settle')
    throw createError({
      statusCode: 500,
      message: 'Failed to mark splits as settled',
      data: err.message,
    })
  }
})
