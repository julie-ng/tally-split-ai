import { eq, count } from 'drizzle-orm'

/**
 * Returns a user record, scoped to the caller's household.
 * Out-of-household lookups 404 (not 403) — pretend the user does not exist.
 *
 * Includes activity counts:
 * - uploadsCount: receipts they uploaded (FK: uploads.userId)
 * - paidCount: expenses they paid for (FK: expenses.paidByUserId)
 */
export default defineEventHandler(async (event) => {
  const db = useDB()

  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const id = getRouterParam(event, 'id')

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
    columns: {
      id: true,
      username: true,
      displayName: true,
      initials: true,
      avatarUrl: true,
      householdId: true,
    },
    with: {
      household: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!user || user.householdId !== event.context.householdId) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const [[{ uploadsCount }], [{ paidCount }]] = await Promise.all([
    db.select({ uploadsCount: count() })
      .from(schema.uploads)
      .where(eq(schema.uploads.userId, user.id)),
    db.select({ paidCount: count() })
      .from(schema.expenses)
      .where(eq(schema.expenses.paidByUserId, user.id)),
  ])

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    initials: user.initials,
    avatarUrl: user.avatarUrl,
    household: user.household,
    uploadsCount,
    paidCount,
  }
})
