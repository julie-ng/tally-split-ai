import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  const uploads = await db.query.uploads.findMany({
    where: eq(schema.uploads.userId, userId),
    columns: {
      hashId: true,
    },
    with: {
      workflowRuns: {
        columns: {
          id: true,
          status: true,
          ocrStatus: true,
          annotationsStatus: true,
          normalizeStatus: true,
          splitStatus: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: [desc(schema.workflowRuns.createdAt)],
      },
    },
  })

  // Return as map keyed by uploadHashId
  const result = {}
  for (const upload of uploads) {
    if (upload.workflowRuns.length > 0) {
      result[upload.hashId] = upload.workflowRuns
    }
  }

  return result
})
