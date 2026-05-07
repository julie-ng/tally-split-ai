import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event)

  const splitId = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { splitId })

  // FK cascade removes split history rows.
  const dbResult = await db
    .delete(schema.splits)
    .where(eq(schema.splits.id, splitId))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Split with ID '${splitId}' not found`,
    })
  }

  log.info({ splitId }, 'Split deleted (history cascaded)')

  return {
    success: true,
    deleted: dbResult[0],
  }
})
