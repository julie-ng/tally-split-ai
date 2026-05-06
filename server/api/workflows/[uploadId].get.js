import { eq, and, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event, 'uploadId')

  const householdId = event.context.householdId
  const uploadId = getRouterParam(event, 'uploadId')

  const upload = await db.query.uploads.findFirst({
    where: and(
      eq(schema.uploads.id, uploadId),
      eq(schema.uploads.householdId, householdId),
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
      message: `Upload not found with id: ${uploadId}`,
    })
  }

  return upload.workflowRuns
})
