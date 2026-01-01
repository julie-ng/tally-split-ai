import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  // Insert a test upload record using Nuxt Hub's database
  const result = await db.insert(schema.uploads).values({
    userId: 'test-user',
    status: 'queued',
    blobName: 'test-blob-' + Date.now(),
    blobUrl: 'https://examplesdfsdfsd.blob.core.windows.net/test',
    originalFilename: 'test-receipt.jpg',
    contentType: 'image/jpeg',
    size: 12345
  }).returning()

  return {
    success: true,
    inserted: result[0]
  }
})
