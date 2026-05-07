import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const uploads = await db.query.uploads.findMany({
    where: eq(schema.uploads.householdId, householdId),
    columns: {
      id: true,
    },
    with: {
      workflowRuns: {
        columns: {
          id: true,
          status: true,
          ocrStatus: true,
          annotationsStatus: true,
          normalizeStatus: true,
          createSplitStatus: true,
          adjustSplitStatus: true,
          errors: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: [desc(schema.workflowRuns.createdAt)],
      },
    },
  })

  // Return as map keyed by uploadId
  const result = {}
  for (const upload of uploads) {
    if (upload.workflowRuns.length > 0) {
      result[upload.id] = upload.workflowRuns
    }
  }

  return result
})
