import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('split')
  const db = useDB()
  await requireAuthentication(event)
  requireIdParam(event)

  const splitId = parseInt(getRouterParam(event, 'id'), 10)
  await requireAuthorization(event, { splitId })

  // Fetch split before deleting for history tracking
  const split = await db
    .select()
    .from(schema.splits)
    .where(eq(schema.splits.id, splitId))
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
    source: event.context.securityPrincipal,
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
