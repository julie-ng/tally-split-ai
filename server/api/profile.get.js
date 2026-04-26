import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  const db = useDB()
  const profile = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
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

  console.log(event.context.sesssions)

  if (!profile) {
    await handleSessionUserNotFound(event, userId)
  }

  return profile
})
