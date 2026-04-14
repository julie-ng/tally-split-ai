import { getContainerClient } from './get-container-client.js'

export async function deleteBlob (blobName) {
  const containerClient = await getContainerClient()
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.delete({
    deleteSnapshots: 'include',
  })
}
