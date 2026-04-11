import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const splitId = parseInt(getRouterParam(event, 'id'), 10)

  // Fetch split before deleting for history tracking
  const split = await db
    .select()
    .from(schema.splits)
    .where(and(
      eq(schema.splits.id, splitId),
      eq(schema.splits.userId, userId),
    ))
    .limit(1)

  if (split.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Split with ID '${splitId}' not found`,
    })
  }

  // Track deletion history before deleting
  await trackDelete(db, {
    historyTable: schema.splitHistory,
    entityId: splitId,
    entityIdColumn: 'splitId',
    source: `user:${userId}`,
  }, split[0])

  const dbResult = await db
    .delete(schema.splits)
    .where(eq(schema.splits.id, splitId))
    .returning()

  log.info({ splitId }, 'Split deleted')

  return {
    success: true,
    deleted: dbResult[0],
  }
})
