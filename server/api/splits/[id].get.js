import { db, schema } from 'hub:db'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  requireIdParam(event)

  const userId = event.context.userId
  const splitId = parseInt(getRouterParam(event, 'id'), 10)

  const split = await db.query.splits.findFirst({
    where: and(
      eq(schema.splits.id, splitId),
      eq(schema.splits.userId, userId),
    ),
    with: {
      receipt: true,
    },
  })

  if (!split) {
    throw createError({
      statusCode: 404,
      message: `Split with ID '${splitId}' not found`,
    })
  }

  return split
})
