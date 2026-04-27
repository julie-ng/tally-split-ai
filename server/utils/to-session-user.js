/**
 * Project the canonical user record into the shape stored in the auth session.
 *
 * Single source of truth for the session user payload — used by the OAuth
 * callback (`setUserSession`) and the user PATCH handler (`replaceUserSession`)
 * so the two paths can't drift.
 *
 * @param {object} dbUser - Row from `schema.users`
 * @returns {object} Session user object
 */
export function toSessionUser (dbUser) {
  return {
    id: dbUser.id,
    githubId: dbUser.githubId,
    householdId: dbUser.householdId,
    username: dbUser.username,
    displayName: dbUser.displayName,
    initials: dbUser.initials,
    avatarUrl: dbUser.avatarUrl,
    lastLoginAt: dbUser.lastLoginAt,
  }
}
