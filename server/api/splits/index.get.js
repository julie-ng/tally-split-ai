import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

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

  return splits
})
