import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await requireAuthentication(event)
  const userId = event.context.userId

  const uploads = await db.query.uploads.findMany({
    where: eq(schema.uploads.userId, userId),
    orderBy: [desc(schema.uploads.createdAt)],
    columns: {
      id: true,
      hashId: true,
      title: true,
      status: true,
      analysisStatus: true,
      originalFilename: true,
      thumbnailUrl: true,
      blobUrl: true,
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
