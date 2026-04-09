import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const splitId = parseInt(getRouterParam(event, 'id'), 10)

  const dbResult = await db
    .delete(schema.splits)
    .where(and(
      eq(schema.splits.id, splitId),
      eq(schema.splits.userId, userId),
    ))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Split with ID '${splitId}' not found`,
    })
  }

  log.info({ splitId }, 'Split deleted')

  return {
    success: true,
    deleted: dbResult[0],
  }
})
