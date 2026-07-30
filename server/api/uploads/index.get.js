import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  // No requireTaskPermission: tasks have no session and thus no householdId, so
  // they cannot reach household-scoped collection endpoints.
  const householdId = event.context.householdId

  const uploads = await db.query.uploads.findMany({
    where: eq(schema.uploads.householdId, householdId),
    orderBy: [desc(schema.uploads.createdAt)],
    columns: {
      id: true,
      title: true,
      status: true,
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
      // The FK only — the table resolves receipt title/date from the receipts
      // store by this id. No `with: { receipt }` join: a broadcast can't produce
      // one (row triggers don't join), so embedding it here would make fetched
      // and pushed rows disagree — live-created uploads rendered blank forever.
      receiptId: true,
    },
  })

  return uploads
})
