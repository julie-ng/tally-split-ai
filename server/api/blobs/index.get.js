import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } from '@azure/storage-blob';

export default defineEventHandler(async (event) => {
  const ACCOUNT_NAME = process.env.AZ_STORAGE_ACCOUNT;
  const ACCOUNT_KEY = process.env.AZ_STORAGE_ACCOUNT_KEY;
  const CONTAINER_NAME = process.env.AZ_STORAGE_CONTAINER_NAME;

  // Validate environment variables
  if (!ACCOUNT_NAME || !ACCOUNT_KEY || !CONTAINER_NAME) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing required Azure Storage configuration',
      message: 'Required environment variables: AZ_STORAGE_ACCOUNT, AZ_STORAGE_ACCOUNT_KEY, AZ_STORAGE_CONTAINER_NAME'
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

    // Create blob service client
    const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
    const blobServiceClient = new BlobServiceClient(
      `https://${ACCOUNT_NAME}.blob.core.windows.net`,
      sharedKeyCredential
    );

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Check if container exists
    const exists = await containerClient.exists();
    if (!exists) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Container not found',
        message: `Container "${CONTAINER_NAME}" does not exist`
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
      const blobClient = containerClient.getBlobClient(blob.name);

      // Generate SAS token for read access valid for 5 minutes
      const sasToken = generateBlobSASQueryParameters({
        containerName: CONTAINER_NAME,
        blobName: blob.name,
        permissions: BlobSASPermissions.parse('r'), // Read permission only
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 5 * 60 * 1000), // 5 minutes from now
        contentDisposition: 'inline' // Display in browser instead of download
      }, sharedKeyCredential).toString();

      blobs.push({
        filename: blob.name,
        url: blobClient.url,
        sasUrl: `${blobClient.url}?${sasToken}`,
        uploadedAt: blob.properties.createdOn,
        lastModified: blob.properties.lastModified,
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        tags: blob.tags || {}
      });
    }

    return {
      accountName: ACCOUNT_NAME,
      containerName: CONTAINER_NAME,
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
