import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for batch settle request
const batchSettleSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  requireUserId(event)
  const userId = event.context.userId

  // Validate request body
  const result = await readValidatedBody(event, body => batchSettleSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: result.error.flatten().fieldErrors,
    }
  }

  const { year, month } = result.data

  try {
    const updated = await db.transaction(async (tx) => {
      // Lock + read full rows for before state
      const beforeRows = await tx
        .select({ splits: schema.splits })
        .from(schema.splits)
        .innerJoin(schema.receipts, eq(schema.splits.receiptId, schema.receipts.id))
        .where(
          and(
            eq(schema.splits.userId, userId),
            sql`EXTRACT(YEAR FROM ${schema.receipts.date}::date)::int = ${year}`,
            sql`EXTRACT(MONTH FROM ${schema.receipts.date}::date)::int = ${month}`,
          ),
        )
        .for('update')

      if (beforeRows.length === 0) return []

      const splitIds = beforeRows.map(r => r.splits.id)

      // Batch update all splits to mark as settled
      const afterRows = await tx
        .update(schema.splits)
        .set({
          isSettled: true,
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.splits.userId, userId),
            sql`${schema.splits.id} IN ${splitIds}`,
          ),
        )
        .returning()

      // Match before → after by ID for diffing
      const afterById = Object.fromEntries(afterRows.map(r => [r.id, r]))
      const entities = beforeRows.map(r => ({
        entityId: r.splits.id,
        before: r.splits,
        after: afterById[r.splits.id],
      }))

      await trackBatchChanges(tx, {
        historyTable: schema.splitHistory,
        entityIdColumn: 'splitId',
        source: `user:${userId}`,
      }, entities)

      return afterRows
    })

    log.info({ year, month, count: updated.length }, 'Batch settled')

    return {
      success: true,
      updatedCount: updated.length,
      message: `Successfully marked ${updated.length} split(s) as settled`,
    }
  }
  catch (err) {
    log.error({ year, month, err }, 'Failed to batch settle')
    throw createError({
      statusCode: 500,
      message: 'Failed to mark splits as settled',
      data: err.message,
    })
  }
})
