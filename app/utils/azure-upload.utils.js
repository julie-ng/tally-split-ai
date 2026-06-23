/**
 * Upload a blob to Azure Blob Storage via XHR with progress tracking
 *
 * @param {Object} options
 * @param {string} options.url - Upload URL with SAS token
 * @param {File|Blob} options.file - The file or blob to upload
 * @param {string} [options.contentType] - Content-Type header (defaults to file.type)
 * @param {function} [options.onProgress] - Progress callback, receives percentage (0-100)
 * @returns {Promise<void>} Resolves on success, rejects with Error on failure
 */
export function uploadBlobToAzure ({ url, file, contentType, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable && onProgress) {
        const percentComplete = Math.round((evt.loaded / evt.total) * 100)
        onProgress(percentComplete)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      }
      else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('PUT', url)
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob')
    xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream')

    xhr.send(file)
  })
}
