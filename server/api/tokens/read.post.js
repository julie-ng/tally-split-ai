export default defineEventHandler(async (event) => {
  // ⚠️ TODO - implement security.
  requireUserId(event)
  const userId = event.context.userId

  // Validate environment variables
  try {
    azureStorageUtils.getAzureStorageConfig()
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
      message: 'Invalid request body.'
    })
  }

  const { action, blobName } = body

  // Validate action
  if (action !== 'read') {
    throw createError({
      statusCode: 400,
      message: 'Invalid action.'
    })
  }

  // Validate blobName
  if (!blobName || typeof blobName !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid blobName. Must be a non-empty string'
    })
  }

  // Generate SAS token with read-only permissions (5 minutes validity)
  const { blobUrl, sasToken, uploadUrl, expiresAt } = azureStorageUtils.generateBlobSasToken(blobName, {
    permissions: 'read',
    expiresInMinutes: 5
  })

  return {
    success: true,
    action,
    blobName,
    blobUrl,
    sasToken,
    blobUrlWithSas: uploadUrl,
    expiresAt
  }
})
