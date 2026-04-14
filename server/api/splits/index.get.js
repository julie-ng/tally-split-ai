import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  const userId = event.context.userId

  // Get optional year/month filter from query params
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year) : null
  const month = query.month ? parseInt(query.month) : null

  const splits = await db.query.splits.findMany({
    where: eq(schema.splits.userId, userId),
    with: {
      receipt: {
        with: {
          uploads: true,
        },
      },
    },
  })

  // Filter by receipt date if year/month provided
  if (year && month) {
    return splits.filter((split) => {
      if (!split.receipt?.date) return false
      const date = new Date(split.receipt.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  }

  return splits
})
