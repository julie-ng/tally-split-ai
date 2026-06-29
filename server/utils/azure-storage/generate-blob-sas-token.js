import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import { useAzureStorageConfig } from './use-azure-storage-config.js'
import { generateBlobUrl } from './generate-blob-url.js'

/**
 * Generate SAS token for Azure Blob Storage.
 * @param {string} blobName - The blob name/path
 * @param {Object} options - SAS token options
 * @param {string} options.permissions - Permissions: 'read', 'create', or 'delete'
 * @param {number} options.expiresInMinutes - Token validity duration in minutes
 * @returns {Object} Object containing sasToken, blobUrl, uploadUrl, and expiresAt
 */
export function generateBlobSasToken (blobName, { permissions = 'read', expiresInMinutes = 5 } = {}) {
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
      sasPermissions.tag = true
      break
    case 'delete':
      sasPermissions.delete = true
      break
    default:
      throw new Error(`Invalid permission: ${permissions}. Must be 'read', 'create', or 'delete'`)
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
