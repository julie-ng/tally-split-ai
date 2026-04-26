import { z } from 'zod'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // TODO: replace getUserSession with guards.requireAuthentication once
  // nuxt-auth-utils is wired into the global auth path.
  // See server/utils/guards/require-authentication.js
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    logSecurityEvent(event, 'warn', { reason: 'no_session' }, 'Profile update without session')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const result = await readValidatedBody(event, body => zodSchemas.profileUpdateSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const db = useDB()
  let updated
  try {
    const rows = await db
      .update(schema.users)
      .set(result.data)
      .where(eq(schema.users.id, session.user.id))
      .returning({
        id: schema.users.id,
        githubId: schema.users.githubId,
        username: schema.users.username,
        displayName: schema.users.displayName,
        initials: schema.users.initials,
        avatarUrl: schema.users.avatarUrl,
        lastLoginAt: schema.users.lastLoginAt,
      })
    updated = rows[0]
  }
  catch (err) {
    const log = useLogger('profile')
    log.error({ err, sessionUserId: session.user.id }, 'Profile update failed')
    throw createError({ statusCode: 500, message: 'Failed to update profile' })
  }

  if (!updated) {
    await handleSessionUserNotFound(event, session.user.id)
  }

  await replaceUserSession(event, {
    user: {
      ...session.user,
      displayName: updated.displayName,
      initials: updated.initials,
    },
  })

  return updated
})
