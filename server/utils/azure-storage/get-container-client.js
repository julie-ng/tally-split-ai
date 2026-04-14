import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { useAzureStorageConfig } from './use-azure-storage-config.js'

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
