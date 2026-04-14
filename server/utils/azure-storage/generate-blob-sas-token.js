import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'
import { useAzureStorageConfig } from './use-azure-storage-config.js'
import { generateBlobUrl } from './generate-blob-url.js'

export function generateBlobSasToken (blobName, { permissions = 'read', expiresInMinutes = 5 } = {}) {
  const { account, container, accountKey } = useAzureStorageConfig()

  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)

  const sasPermissions = new BlobSASPermissions()

  switch (permissions) {
    case 'read':
      sasPermissions.read = true
      break
    case 'create':
      sasPermissions.create = true
      sasPermissions.tag = true
      break
    default:
      throw new Error(`Invalid permission: ${permissions}. Must be 'read' or 'create'`)
  }

  const startsOn = new Date()
  const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000)

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
