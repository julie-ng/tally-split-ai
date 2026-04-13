import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await requireAuthentication(event)
  requireIdParam(event)

  const splitId = parseInt(getRouterParam(event, 'id'), 10)
  await requireAuthorization(event, { splitId })

  const split = await db.query.splits.findFirst({
    where: eq(schema.splits.id, splitId),
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
