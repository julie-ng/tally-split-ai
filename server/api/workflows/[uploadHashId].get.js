import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireHashIdParam(event, 'uploadHashId')

  const userId = event.context.userId
  const hashId = getRouterParam(event, 'uploadHashId')

  const upload = await db.query.uploads.findFirst({
    where: and(
      eq(schema.uploads.hashId, hashId),
      eq(schema.uploads.userId, userId),
    ),
    columns: { id: true },
    with: {
      workflowRuns: {
        orderBy: [desc(schema.workflowRuns.createdAt)],
      },
    },
  })

  if (!upload) {
    throw createError({
      statusCode: 404,
      message: `Upload not found with hash ID: ${hashId}`,
    })
  }

  return upload.workflowRuns
})
