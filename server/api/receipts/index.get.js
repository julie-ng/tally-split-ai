import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  // No requireTaskPermission: tasks have no session and thus no householdId, so
  // they cannot reach household-scoped collection endpoints.
  const householdId = event.context.householdId

  const receipts = await db.query.receipts.findMany({
    where: eq(schema.receipts.householdId, householdId),
    with: {
      uploads: {
        columns: {
          id: true,
          originalFilename: true,
        },
      },
    },
  })

  return receipts
})
