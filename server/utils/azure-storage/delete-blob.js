import { getContainerClient } from './get-container-client.js'

/**
 * Delete a blob from Azure Storage.
 * @param {string} blobName - The blob name/path to delete
 * @returns {Promise<void>}
 * @throws {Error} If blob deletion fails
 */
export async function deleteBlob (blobName) {
  const containerClient = await getContainerClient()
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.delete({
    deleteSnapshots: 'include', // Delete blob and all its snapshots
  })
}
