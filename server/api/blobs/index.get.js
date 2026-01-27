export default defineEventHandler(async (event) => {
  requireUserId(event)
  const userId = event.context.userId

  const storageConfig = azureStorageUtils.useAzureStorageConfig()
  const containerClient = await azureStorageUtils.getContainerClient()

  try {
    // List blobs for specific user using virtual directory prefix
    const blobs = []
    const prefix = `${userId}/`
    for await (const blob of containerClient.listBlobsFlat({
      prefix,
      includeTags: true,
      includeMetadata: true,
    })) {
      // Generate SAS token for read access valid for 5 minutes
      const { blobUrl, uploadUrl: sasUrl } = azureStorageUtils.generateBlobSasToken(blob.name, {
        permissions: 'read',
        expiresInMinutes: 5,
      })

      // Remove user-id from tags before returning
      // eslint-disable-next-line no-unused-vars
      const { 'user-id': _userId, ...filteredTags } = blob.tags || {}

      blobs.push({
        filename: blob.name,
        url: blobUrl,
        sasUrl,
        uploadedAt: blob.properties.createdOn,
        lastModified: blob.properties.lastModified,
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        tags: filteredTags,
      })
    }

    return {
      accountName: storageConfig.account,
      containerName: storageConfig.container,
      count: blobs.length,
      blobs,
    }
  }
  catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to list blobs',
      message: error.message,
    })
  }
})
