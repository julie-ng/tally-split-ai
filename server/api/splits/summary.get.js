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
  let user1Owes = 0
  let user2Owes = 0
  let pendingCount = 0 // splits without paidBy set

  for (const split of splits) {
    if (!split.paidBy || split.owedAmount === null) {
      // Skip splits that don't have payer assigned yet
      pendingCount++
      continue
    }

    if (split.paidBy === 'user1') {
      // user1 paid, so user2 owes half
      user2Owes += split.owedAmount
    }
    else {
      // user2 paid, so user1 owes half
      user1Owes += split.owedAmount
    }
  }

  // Net balance: positive means user1 owes user2, negative means user2 owes user1
  const netBalance = user1Owes - user2Owes

  return {
    user1Owes: Math.round(user1Owes * 100) / 100,
    user2Owes: Math.round(user2Owes * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    unsettledCount: splits.length,
    pendingCount, // splits without paidBy assigned
  }
})
