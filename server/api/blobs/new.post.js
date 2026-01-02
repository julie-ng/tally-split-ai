import { db, schema } from 'hub:db'
// import { hashUploadName } from '~/server/utils/hash-upload-name'

export default defineEventHandler(async (event) => {
  // Validate environment variables
  try {
    getAzureStorageConfig()
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  const body = await readBody(event)

  // Validate request body
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  const { userId, filename } = body

  // Validate userId
  if (!userId || typeof userId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid userId. Must be a non-empty string'
    })
  }

  // Validate filename
  if (!filename || typeof filename !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid filename. Must be a non-empty string'
    })
  }

  // Generate Azure-friendly filename
  let azureFilename
  try {
    azureFilename = createAzureFilename(filename)
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }

  // Construct blob path with userId as virtual directory
  const blobPath = `${userId}/${azureFilename}`

  // Generate SAS token for upload (3 minutes validity)
  const { blobUrl, uploadUrl, expiresAt } = generateBlobSasToken(blobPath, {
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
  const result = await db.insert(schema.uploads).values({
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
    uploadRecord: result[0]
  }
})
