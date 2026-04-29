import { eq, and, inArray } from 'drizzle-orm'

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

  // Calculate running totals for each user
  let userOneShare = 0
  let userTwoShare = 0
  let pendingCount = 0 // splits without share amounts set

  for (const split of filteredSplits) {
    if (split.userOneShare === null || split.userTwoShare === null) {
      // Skip splits that don't have amounts assigned yet
      pendingCount++
      continue
    }

    userOneShare += split.userOneShare
    userTwoShare += split.userTwoShare
  }

  // Net balance: positive means userOne owes userTwo, negative means userTwo owes userOne
  const netBalance = userOneShare - userTwoShare

  return {
    userOneShare: Math.round(userOneShare * 100) / 100,
    userTwoShare: Math.round(userTwoShare * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    unsettledCount: filteredSplits.length,
    pendingCount, // splits without amounts assigned
  }
})
