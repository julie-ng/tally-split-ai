import { db, schema } from 'hub:db'
import { z } from 'zod'

const requestSchema = z.object({
  filename: z.string()
})

export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  azureStorageUtils.useAzureStorageConfig()

  const result = await readValidatedBody(event, body => requestSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: "Invalid request body",
      errors: z.flattenError(result.error).fieldErrors
    }
  }
  const { filename } = result.data

  // Generate Azure-friendly filename
  const azureFilename = createAzureFilename(filename)

  // Construct blob path with userId as virtual directory
  const blobPath = `${userId}/${azureFilename}`

  // Generate SAS token for upload (3 minutes validity)
  const { blobUrl, uploadUrl, expiresAt } = azureStorageUtils.generateBlobSasToken(blobPath, {
    permissions: 'write',
    expiresInMinutes: 3
  })

  // Generate deterministic hash ID
  const timestamp = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
  const hashId = hashUploadName(userId, filename, timestamp)

  // Extract receipt metadata from filename
  const receiptTitle = extractReceiptTitle(filename)
  const receiptDate = extractReceiptDate(filename)
  const receiptTotal = extractReceiptTotal(filename)

  // Insert record into uploads table
  const dbResult = await db.insert(schema.uploads).values({
    hashId,
    userId,
    title: receiptTitle || 'Untitled',
    status: 'initialized',
    blobName: blobPath,
    blobUrl,
    originalFilename: filename,
    receiptDate,
    receiptTotal: receiptTotal ? parseFloat(receiptTotal) : null
  }).returning()

  return {
    originalFilename: filename,
    filename: azureFilename,
    hashId,
    blob: {
      path: blobPath,
      url: blobUrl,
      uploadUrl,
      uploadExpiresAt: expiresAt
    },
    uploadRecord: dbResult[0]
  }
})
