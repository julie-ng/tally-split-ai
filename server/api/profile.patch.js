import { z } from 'zod'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await guards.requireAuthentication(event)
  const userId = event.context.userId

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
      .where(eq(schema.users.id, userId))
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
    log.error({ err, sessionUserId: userId }, 'Profile update failed')
    throw createError({ statusCode: 500, message: 'Failed to update profile' })
  }

  if (!updated) {
    await handleSessionUserNotFound(event, userId)
  }

  await replaceUserSession(event, { user: updated })

  return updated
})
