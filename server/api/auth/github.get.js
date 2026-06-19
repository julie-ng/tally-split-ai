import { eq } from 'drizzle-orm'

export default defineOAuthGitHubEventHandler({
  async onSuccess (event, { user }) {
    const log = useLogger('auth')
    const db = useDB()

    // GitHub auth has already succeeded by the time we're here. A throw in
    // either step below escapes the OAuth onError handler (it only catches
    // handshake failures), so each is caught explicitly and the step is named
    // in the log — otherwise a post-auth failure is a silent 500 → blank /login.

    // Step 1: refresh the user record.
    // Closed user set: users must be added explicitly via the household member
    // endpoint (Phase 5). OAuth login only refreshes existing user records —
    // unknown githubIds are rejected.
    let dbUser
    try {
      ;[dbUser] = await db
        .update(schema.users)
        .set({
          username: user.login,
          avatarUrl: user.avatar_url,
          lastLoginAt: new Date(),
        })
        .where(eq(schema.users.githubId, user.id))
        .returning()
    }
    catch (error) {
      log.error({ code: error?.cause?.code, error }, 'Login failed: database error refreshing user record')
      return sendRedirect(event, '/login?error=server_error')
    }

    if (!dbUser) {
      logSecurityEvent(event,
        'warn',
        {
          githubId: user.id,
          githubLogin: user.login,
          reason: 'unknown_user',
        },
        'OAuth login rejected')
      return sendRedirect(event, '/login/unauthorized')
    }

    // Step 2: write the session cookie.
    try {
      await setUserSession(event, {
        user: toSessionUser(dbUser),
      })
    }
    catch (error) {
      log.error({ code: error?.cause?.code, userId: dbUser.id, error }, 'Login failed: session write error')
      return sendRedirect(event, '/login?error=server_error')
    }

    log.info({ userId: dbUser.id, githubId: dbUser.githubId }, 'GitHub OAuth login')
    return sendRedirect(event, '/dashboard')
  },
  onError (event, error) {
    const log = useLogger('auth')
    log.error({ error }, 'GitHub OAuth error')
    return sendRedirect(event, '/login?error=github_oauth_error')
  },
})
