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
    // Get all split IDs for this user in the given month
    // Need to join with receipts to filter by receipt.date
    const splitsToUpdate = await db
      .select({ id: schema.splits.id })
      .from(schema.splits)
      .innerJoin(schema.receipts, eq(schema.splits.receiptId, schema.receipts.id))
      .where(
        and(
          eq(schema.splits.userId, userId),
          // Filter by year and month using SQL date functions
          sql`EXTRACT(YEAR FROM ${schema.receipts.date}::date)::int = ${year}`,
          sql`EXTRACT(MONTH FROM ${schema.receipts.date}::date)::int = ${month}`,
        ),
      )

    if (splitsToUpdate.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        message: 'No splits found for the specified month',
      }
    }

    // Extract IDs for the update
    const splitIds = splitsToUpdate.map(s => s.id)

    // Batch update all splits to mark as settled
    const updated = await db
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
