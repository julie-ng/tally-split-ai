import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const receipts = await db.query.receipts.findMany({
    where: eq(schema.receipts.householdId, householdId),
    with: {
      uploads: {
        columns: {
          id: true,
          analysisStatus: true,
          originalFilename: true,
        },
      },
    },
  })

  return receipts
})
