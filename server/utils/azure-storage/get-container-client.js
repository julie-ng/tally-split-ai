import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { useAzureStorageConfig } from './use-azure-storage-config.js'

/**
 * Get Azure Blob Storage container client.
 * @param {Object} options - Options for getting container client
 * @param {boolean} options.checkExists - Whether to check if container exists (default: true)
 * @returns {Promise<ContainerClient>} Container client instance
 * @throws {Error} If checkExists is true and container does not exist
 */
export async function getContainerClient ({ checkExists = true } = {}) {
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
