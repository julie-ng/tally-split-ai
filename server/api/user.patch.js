import { z } from 'zod'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  const result = await readValidatedBody(event, body => zodSchemas.userUpdateSchema.safeParse(body))
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
      .returning()
    updated = rows[0]
  }
  catch (err) {
    const log = useLogger('user')
    log.error({ err, sessionUserId: userId }, 'User update failed')
    throw createError({ statusCode: 500, message: 'Failed to update user' })
  }

  if (!updated) {
    await handleSessionUserNotFound(event, userId)
  }

  const sessionUser = toSessionUser(updated)
  await replaceUserSession(event, { user: sessionUser })

  return sessionUser
})
