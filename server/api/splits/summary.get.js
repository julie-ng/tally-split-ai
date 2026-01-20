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
  let userAOwes = 0
  let userBOwes = 0
  let pendingCount = 0 // splits without debt amounts set

  for (const split of splits) {
    if (split.userADebt === null || split.userBDebt === null) {
      // Skip splits that don't have amounts assigned yet
      pendingCount++
      continue
    }

    userAOwes += split.userADebt
    userBOwes += split.userBDebt
  }

  // Net balance: positive means userA owes userB, negative means userB owes userA
  const netBalance = userAOwes - userBOwes

  return {
    userAOwes: Math.round(userAOwes * 100) / 100,
    userBOwes: Math.round(userBOwes * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    unsettledCount: splits.length,
    pendingCount, // splits without amounts assigned
  }
})
