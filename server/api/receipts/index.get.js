import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const receipts = await db.select()
    .from(schema.receipts)
    .where(eq(schema.receipts.userId, userId))

  return receipts
})
