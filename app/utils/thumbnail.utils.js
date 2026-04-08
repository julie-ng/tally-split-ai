import { uploadBlobToAzure } from '~/utils/azure-upload.utils'

/**
 * Generate a thumbnail from a file using Canvas API
 *
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width in pixels (default: 100)
 * @returns {Promise<Blob>} Thumbnail as a Blob
 */
export function generateThumbnail (file, maxWidth = 100) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      const scale = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * scale

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob.size > 30000) {
            canvas.toBlob(
              blob => resolve(blob),
              'image/jpeg',
              0.7,
            )
          }
          else {
            resolve(blob)
          }
        },
        'image/jpeg',
        0.85,
      )
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Fetch a fresh SAS token and upload a thumbnail to Azure Blob Storage
 *
 * @param {Blob} thumbnailBlob - The thumbnail blob to upload
 * @param {string} blobPath - The full blob path for the thumbnail
 * @returns {Promise<void>}
 */
export async function uploadThumbnailToAzure (thumbnailBlob, blobPath) {
  const tokenResponse = await $fetch('/api/tokens/upload', {
    method: 'POST',
    body: {
      action: 'create',
      blobPath,
    },
  })

  await uploadBlobToAzure({
    url: tokenResponse.upload.url,
    file: thumbnailBlob,
    contentType: 'image/jpeg',
  })
}
