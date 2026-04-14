import { useAzureStorageConfig } from './azure-storage/use-azure-storage-config.js'
import { generateBlobUrl } from './azure-storage/generate-blob-url.js'
import { getContainerClient } from './azure-storage/get-container-client.js'
import { generateBlobSasToken } from './azure-storage/generate-blob-sas-token.js'
import { deleteBlob } from './azure-storage/delete-blob.js'

export const azureStorageUtils = {
  useAzureStorageConfig,
  getContainerClient,
  generateBlobSasToken,
  generateBlobUrl,
  deleteBlob,
}
