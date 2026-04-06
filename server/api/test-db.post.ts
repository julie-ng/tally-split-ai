export default defineEventHandler(async (event) => {
  const db = useDB()
  // Insert a test upload record
  const result = await db.insert(schema.uploads).values({
    userId: 'test-user',
    status: 'queued',
    blobName: 'test-blob-' + Date.now(),
    blobUrl: 'https://examplesdfsdfsd.blob.core.windows.net/test',
    originalFilename: 'test-receipt.jpg',
    contentType: 'image/jpeg',
    size: 12345,
  }).returning()

  return {
    success: true,
    inserted: result[0],
  }
})
