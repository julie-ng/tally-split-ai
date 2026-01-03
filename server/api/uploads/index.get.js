import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'

const delay = (durationMs) => {
  console.log('delay', durationMs)
  return new Promise(resolve => setTimeout(resolve, durationMs))
}

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  // Disable caching for this endpoint
  // setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')

  const uploads = await db.select()
    .from(schema.uploads)
    .where(eq(schema.uploads.userId, userId))

  // Artificial delay for testing loading states
  // await delay(1500)

  return uploads
})
