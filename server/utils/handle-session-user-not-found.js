/**
 * Handle the case where a valid session references a userId that does not
 * exist in the database. This indicates likely cookie tampering: the cookie
 * passed signature verification but its payload points to a phantom user.
 *
 * Logs as a security error, clears the session, and throws 401.
 *
 * @param {H3Event} event
 * @param {string} sessionUserId - The userId from the session cookie
 */
export async function handleSessionUserNotFound (event, sessionUserId) {
  logSecurityEvent(event, 'error', {
    reason: 'session_user_not_found',
    sessionUserId,
  }, 'Session references non-existent user — possible cookie tampering')
  await clearUserSession(event)
  throw createError({ statusCode: 401, message: 'Unauthorized' })
}
