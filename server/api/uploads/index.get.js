import { db, schema } from 'hub:db'
import { eq, desc } from 'drizzle-orm'

const delay = (durationMs) => {
  console.log('delay', durationMs)
  return new Promise(resolve => setTimeout(resolve, durationMs))
}

export default defineEventHandler(async (event) => {
  // Disable caching for this endpoint
  // setResponseHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')

  // console.log('API called at:', new Date().toISOString())

  // ⚠️ TODO
  const userId = process.env.NUXT_PUBLIC_DEMO_USER_ID


  const uploads = await db.select()
    .from(schema.uploads)
    .where(eq(schema.uploads.userId, userId))

  // Artificial delay for testing loading states
  await delay(1500)

  return uploads
})
