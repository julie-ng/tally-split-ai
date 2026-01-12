import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'

/**
 * Get Azure Storage configuration from environment variables
 * @returns {Object} Configuration object with account, container, and key
 * @throws {Error} If configuration is missing
 */
function useAzureStorageConfig () {
  const config = {
    account: process.env.AZ_STORAGE_ACCOUNT,
    container: process.env.AZ_STORAGE_CONTAINER_NAME,
    accountKey: process.env.AZ_STORAGE_ACCOUNT_KEY,
  }

  if (!config.account || !config.container || !config.accountKey) {
    throw new Error('Azure Storage configuration is missing')
  }

  return config
}

/**
 * Generate blob URL
 * @param {string} blobName - The blob name/path
 * @returns {string} Full blob URL
 */
function generateBlobUrl (blobName) {
  const { account, container } = useAzureStorageConfig()
  return `https://${account}.blob.core.windows.net/${container}/${blobName}`
}

/**
 * Get Azure Blob Storage container client
 * @param {Object} options - Options for getting container client
 * @param {boolean} options.checkExists - Whether to check if container exists (default: true)
 * @returns {Promise<ContainerClient>} Container client instance
 * @throws {Error} If checkExists is true and container does not exist
 */
async function getContainerClient ({ checkExists = true } = {}) {
  const { account, accountKey, container } = useAzureStorageConfig()

  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)
  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential,
  )

  const containerClient = blobServiceClient.getContainerClient(container)

  if (checkExists) {
    const exists = await containerClient.exists()
    if (!exists) {
      throw new Error(`Container "${container}" does not exist`)
    }
  }

  return containerClient
}

/**
 * Generate SAS token for Azure Blob Storage
 * @param {string} blobName - The blob name/path
 * @param {Object} options - SAS token options
 * @param {string} options.permissions - Permissions: 'read', 'create', or 'write'
 * @param {number} options.expiresInMinutes - Token validity duration in minutes
 * @returns {Object} Object containing sasToken, blobUrl, uploadUrl, and expiresAt
 */
function generateBlobSasToken (blobName, { permissions = 'read', expiresInMinutes = 5 } = {}) {
  const { account, container, accountKey } = useAzureStorageConfig()

  // Create shared key credential
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)

  // Set permissions
  const sasPermissions = new BlobSASPermissions()

  switch (permissions) {
    case 'read':
      sasPermissions.read = true
      break
    case 'create':
      sasPermissions.create = true
      break
    case 'write':
      sasPermissions.create = true
      sasPermissions.write = true
      sasPermissions.tag = true // Add tags permission for write
      break
    default:
      throw new Error(`Invalid permission: ${permissions}. Must be 'read', 'create', or 'write'`)
  }

  // Set expiration time
  const startsOn = new Date()
  const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000)

  // Generate SAS token
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: container,
      blobName: blobName,
      permissions: sasPermissions,
      startsOn: startsOn,
      expiresOn: expiresOn,
    },
    sharedKeyCredential,
  ).toString()

  const blobUrl = generateBlobUrl(blobName)

  return {
    sasToken,
    blobUrl,
    uploadUrl: `${blobUrl}?${sasToken}`,
    expiresAt: expiresOn.toISOString(),
  }
}

/**
 * Delete a blob from Azure Storage
 * @param {string} blobName - The blob name/path to delete
 * @returns {Promise<void>}
 * @throws {Error} If blob deletion fails
 */
async function deleteBlob (blobName) {
  const containerClient = await getContainerClient()
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.delete({
    deleteSnapshots: 'include', // Delete blob and all its snapshots
  })
}

export const azureStorageUtils = {
  useAzureStorageConfig,
  getContainerClient,
  generateBlobSasToken,
  generateBlobUrl,
  deleteBlob,
}
