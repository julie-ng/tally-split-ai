import { eq } from 'drizzle-orm'

/**
 * Create a personal household for a user and assign it.
 *
 * Used by the OAuth callback when a brand-new user logs in for the first time
 * and has no `householdId` yet. Not used for users added via the household
 * member endpoint — those are inserted with the inviter's householdId already
 * set, so they never hit this path.
 *
 * @param {object} db - Drizzle DB instance
 * @param {object} user - The freshly-inserted user row (must have `id` and `username`)
 * @returns {Promise<object>} Updated user row with `householdId` populated
 */
export async function createPersonalHousehold (db, user) {
  const [household] = await db
    .insert(schema.households)
    .values({
      name: `${user.username}'s household`,
      description: 'Auto-generated personal household.',
    })
    .returning()

  const [updated] = await db
    .update(schema.users)
    .set({ householdId: household.id })
    .where(eq(schema.users.id, user.id))
    .returning()

  return updated
}
