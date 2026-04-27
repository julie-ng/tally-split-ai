import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  // splits has no householdId column; filter via the linked receipt
  const splits = await db.query.splits.findMany({
    where: inArray(
      schema.splits.receiptId,
      db.select({ id: schema.receipts.id })
        .from(schema.receipts)
        .where(eq(schema.receipts.householdId, householdId)),
    ),
    with: {
      receipt: {
        columns: {
          id: true,
          title: true,
          merchantName: true,
          date: true,
        },
        with: {
          uploads: {
            columns: {
              analysisStatus: true,
              originalFilename: true,
            },
          },
        },
      },
    },
  })

  if (year && month) {
    return splits.filter((split) => {
      if (!split.receipt?.date) return false
      const date = new Date(split.receipt.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  }

  return splits
})
