import { useAzureStorageConfig } from './use-azure-storage-config.js'

/**
 * Generate blob URL.
 * @param {string} blobName - The blob name/path
 * @returns {string} Full blob URL
 */
export function generateBlobUrl (blobName) {
  const { account, container } = useAzureStorageConfig()
  const encodedPath = blobName.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `https://${account}.blob.core.windows.net/${container}/${encodedPath}`
}
