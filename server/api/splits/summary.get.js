import { eq, and, inArray } from 'drizzle-orm'
import { summarizeSplits } from '#shared/utils/splits/split-summary.utils.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  // Get optional year/month filter from query params
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  // splits has no householdId column; filter via the linked receipt
  const queryOptions = {
    where: and(
      inArray(
        schema.splits.receiptId,
        db.select({ id: schema.receipts.id })
          .from(schema.receipts)
          .where(eq(schema.receipts.householdId, householdId)),
      ),
      eq(schema.splits.isSettled, false),
    ),
  }

  if (year && month) {
    queryOptions.with = {
      receipt: { columns: { date: true } },
    }
  }

  const splits = await db.query.splits.findMany(queryOptions)

  let filteredSplits = splits
  if (year && month) {
    filteredSplits = splits.filter((split) => {
      if (!split.receipt?.date) return false
      const date = new Date(split.receipt.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  }

  return summarizeSplits(filteredSplits)
})
