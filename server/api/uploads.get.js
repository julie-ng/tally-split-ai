import { db, schema } from 'hub:db'

export default eventHandler(async (event) => {
  // Query all uploads using Nuxt Hub's database
  const uploads = await db.select().from(schema.uploads)

  // ⚠️ TODO - only query for currently logged in user.

  return uploads
})
