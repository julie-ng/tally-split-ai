import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // TODO: replace getUserSession with guards.requireAuthentication once
  // nuxt-auth-utils is wired into the global auth path.
  // See server/utils/guards/require-authentication.js
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    logSecurityEvent(event, 'warn', { reason: 'no_session' }, 'Profile access without session')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const db = useDB()
  const profile = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: {
      id: true,
      githubId: true,
      username: true,
      displayName: true,
      initials: true,
      avatarUrl: true,
      lastLoginAt: true,
    },
  })

  if (!profile) {
    await handleSessionUserNotFound(event, session.user.id)
  }

  return profile
})
