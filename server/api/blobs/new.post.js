import { z } from 'zod'
import { generateId } from '#shared/utils/generate-id.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('upload')
  const db = useDB()
  await guards.requireAuthentication(event)
  const userId = event.context.userId
  const householdId = event.context.householdId

  azureStorageUtils.useAzureStorageConfig()

  const result = await readValidatedBody(event, body => zodSchemas.newBlobRequestSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }
  const { filename } = result.data

  // Generate Azure-friendly filename
  const azureFilename = createAzureFilename(filename)

  // Pre-generate the upload's id so we can include it in the blob path.
  // Path layout: {userId}/{uploadId}/{filename} — the per-upload subdir
  // means re-uploading the same filename within the same second no longer
  // collides (the old deterministic hashId scheme depended on uniqueness
  // of (userId, filename, timestamp)).
  const id = generateId()

  const blobPath = `${userId}/${id}/${azureFilename}`
  const thumbnailFilename = createThumbnailFilename(azureFilename)
  const thumbnailPath = `${userId}/${id}/${thumbnailFilename}`

  // Generate blob URL (no SAS token — tokens are fetched just-in-time before upload)
  const blobUrl = azureStorageUtils.generateBlobUrl(blobPath)
  const thumbnailUrl = azureStorageUtils.generateBlobUrl(thumbnailPath)

  // Extract receipt metadata from filename
  const receiptTitle = extractReceiptTitle(filename)
  const receiptDate = extractReceiptDate(filename)
  const receiptTotal = extractReceiptTotal(filename)

  // Insert record into uploads table
  const dbResult = await db.insert(schema.uploads).values({
    id,
    userId,
    householdId,
    title: receiptTitle || 'Untitled',
    status: 'initialized',
    blobName: blobPath,
    blobUrl,
    thumbnailName: thumbnailPath,
    thumbnailUrl,
    originalFilename: filename,
    receiptDate,
    receiptTotal: receiptTotal ? parseFloat(receiptTotal) : null,
  }).returning()

  log.info({ id, blobUrl }, 'Upload record created')

  return {
    originalFilename: filename,
    filename: azureFilename,
    id,
    blob: {
      path: blobPath,
      url: blobUrl,
    },
    uploadRecord: dbResult[0],
  }
})
