export default defineOAuthGitHubEventHandler({
  async onSuccess (event, { user }) {
    const log = useLogger('auth')
    const db = useDB()

    const [dbUser] = await db
      .insert(schema.users)
      .values({
        githubId: user.id,
        username: user.login,
        displayName: user.name || null,
        avatarUrl: user.avatar_url,
      })
      .onConflictDoUpdate({
        target: schema.users.githubId,
        set: {
          username: user.login,
          avatarUrl: user.avatar_url,
          lastLoginAt: new Date(),
        },
      })
      .returning()

    await setUserSession(event, {
      user: toSessionUser(dbUser),
    })

    log.info({ userId: dbUser.id, githubId: dbUser.githubId }, 'GitHub OAuth login')
    return sendRedirect(event, '/')
  },
  onError (event, error) {
    const log = useLogger('auth')
    log.error({ error }, 'GitHub OAuth error')
    return sendRedirect(event, '/login?error=github_oauth_error')
  },
})
