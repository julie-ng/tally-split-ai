import { eq } from 'drizzle-orm'

export default defineOAuthGitHubEventHandler({
  async onSuccess (event, { user }) {
    const log = useLogger('auth')
    const db = useDB()

    // Closed user set: users must be added explicitly via the household
    // member endpoint (Phase 5). OAuth login only refreshes existing user
    // records — unknown githubIds are rejected.
    const [dbUser] = await db
      .update(schema.users)
      .set({
        username: user.login,
        avatarUrl: user.avatar_url,
        lastLoginAt: new Date(),
      })
      .where(eq(schema.users.githubId, user.id))
      .returning()

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

    await setUserSession(event, {
      user: toSessionUser(dbUser),
    })

    log.info({ userId: dbUser.id, githubId: dbUser.githubId }, 'GitHub OAuth login')
    return sendRedirect(event, '/dashboard')
  },
  onError (event, error) {
    const log = useLogger('auth')
    log.error({ error }, 'GitHub OAuth error')
    return sendRedirect(event, '/login?error=github_oauth_error')
  },
})
