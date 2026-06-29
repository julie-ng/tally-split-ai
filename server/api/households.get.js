import { eq, asc } from 'drizzle-orm'

/**
 * Returns the current user's household + ordered members.
 * Members are ordered by users.createdAt ASC — same order used to assign
 * userOne/userTwo slots on splits, so member[0] === userOne, member[1] === userTwo.
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const household = await db.query.households.findFirst({
    where: eq(schema.households.id, householdId),
    with: {
      users: {
        columns: {
          id: true,
          username: true,
          displayName: true,
          initials: true,
          avatarUrl: true,
          createdAt: true,
        },
        orderBy: asc(schema.users.createdAt),
      },
    },
  })

  if (!household) {
    throw createError({ statusCode: 404, message: 'Household not found' })
  }

  return {
    id: household.id,
    name: household.name,
    description: household.description,
    customInstructions: household.customInstructions,
    llmConsent: household.llmConsent,
    members: household.users,
  }
})
