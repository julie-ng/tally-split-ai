import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const splits = await db.query.splits.findMany({
    where: and(
      eq(schema.splits.userId, userId),
      eq(schema.splits.isSettled, false),
    ),
  })

  // Calculate running totals for each user
  let userAShare = 0
  let userBShare = 0
  let pendingCount = 0 // splits without share amounts set

  for (const split of splits) {
    if (split.userAShare === null || split.userBShare === null) {
      // Skip splits that don't have amounts assigned yet
      pendingCount++
      continue
    }

    userAShare += split.userAShare
    userBShare += split.userBShare
  }

  // Net balance: positive means userA Share userB, negative means userB Share userA
  const netBalance = userAShare - userBShare

  return {
    userAShare: Math.round(userAShare * 100) / 100,
    userBShare: Math.round(userBShare * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    unsettledCount: splits.length,
    pendingCount, // splits without amounts assigned
  }
})
