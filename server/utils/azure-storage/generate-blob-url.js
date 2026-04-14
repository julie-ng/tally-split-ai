import { useAzureStorageConfig } from './use-azure-storage-config.js'

export function generateBlobUrl (blobName) {
  const { account, container } = useAzureStorageConfig()
  const encodedPath = blobName.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `https://${account}.blob.core.windows.net/${container}/${encodedPath}`
}
