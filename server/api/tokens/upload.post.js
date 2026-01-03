export default defineEventHandler(async (event) => {
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
  if (action !== 'create') {
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

  /**
   * ⚠️ No security implemented. For local DEMO only.
   * In production scenario, need some authentication
   * and authorization before generating a token, that
   * should also be user-specific (e.g. via URL, and
   * own database check).
   */

  // Generate SAS token with create-only permissions (1 minute validity)
  const { blobUrl, sasToken, uploadUrl, expiresAt } = azureStorageUtils.generateBlobSasToken(blobName, {
    permissions: 'create',
    expiresInMinutes: 1
  })

  return {
    blob: {
      name: blobName,
      url: blobUrl
    },
    upload: {
      url: uploadUrl,
      expiresAt
    }
  }
})
