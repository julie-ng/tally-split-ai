import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const uploads = await db.query.uploads.findMany({
    where: eq(schema.uploads.householdId, householdId),
    orderBy: [desc(schema.uploads.createdAt)],
    columns: {
      id: true,
      title: true,
      status: true,
      analysisStatus: true,
      originalFilename: true,
      blobName: true,
      blobUrl: true,
      thumbnailName: true,
      thumbnailUrl: true,
      contentType: true,
      size: true,
      createdAt: true,
      uploadedAt: true,
      analyzedAt: true,
    },
    with: {
      receipt: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
  })

  return uploads
})
