import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  const splits = await db.query.splits.findMany({
    where: eq(schema.splits.userId, userId),
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
