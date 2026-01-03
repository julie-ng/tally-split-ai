export default defineEventHandler(async (event) => {
  // Validate environment variables and get container client
  let containerClient;
  let storageConfig;
  try {
    storageConfig = azureStorageUtils.getAzureStorageConfig();
    containerClient = await azureStorageUtils.getContainerClient();
  } catch (error) {
    throw createError({
      statusCode: error.message.includes('does not exist') ? 404 : 500,
      statusMessage: error.message.includes('does not exist') ? 'Container not found' : 'Azure Storage configuration error',
      message: error.message
    });
  }

  try {
    // Get userId - in development use demo user, otherwise require authentication
    const config = useRuntimeConfig();
    const isDevelopment = config.public.environment === 'development';

    let userId;
    if (isDevelopment) {
      userId = config.public.demoUserId;
      if (!userId) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Development configuration error',
          message: 'NUXT_PUBLIC_DEMO_USER_ID environment variable is required in development'
        });
      }
    } else {
      // ⚠️ TODO: replace with actual authentication
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
        message: 'User authentication is required'
      });
    }

    // List blobs for specific user using virtual directory prefix
    const blobs = [];
    const prefix = `${userId}/`;
    for await (const blob of containerClient.listBlobsFlat({
      prefix,
      includeTags: true,
      includeMetadata: true
    })) {
      // Generate SAS token for read access valid for 5 minutes
      const { blobUrl, uploadUrl: sasUrl } = azureStorageUtils.generateBlobSasToken(blob.name, {
        permissions: 'read',
        expiresInMinutes: 5
      });

      blobs.push({
        filename: blob.name,
        url: blobUrl,
        sasUrl,
        uploadedAt: blob.properties.createdOn,
        lastModified: blob.properties.lastModified,
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        tags: blob.tags || {}
      });
    }

    return {
      accountName: storageConfig.account,
      containerName: storageConfig.container,
      count: blobs.length,
      blobs
    };

  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to list blobs',
      message: error.message
    });
  }
});
