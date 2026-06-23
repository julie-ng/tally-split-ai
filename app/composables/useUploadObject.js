import { useUserStore } from '~/stores/user.store'

/**
 * @typedef {Object} UploadObject
 * @property {string} id - Upload id (matches server-generated id)
 * @property {string} userId - User id (blob path prefix)
 * @property {string} blobPath - Azure blob path (e.g. userId/uploadId/filename)
 * @property {string} originalFilename - Original file name
 * @property {string} azureFilename - Azure blob filename
 * @property {number} size - File size in bytes
 * @property {string} blobUrl - Azure blob URL
 * @property {UploadDetails} upload - Upload details
 * @property {'queued'|'in-progress'|'completed'|'failed'} status - Upload status
 * @property {Date} queuedAt - When upload was queued
 * @property {Array<string>} errors - Array of error messages
 * @property {File} file - The actual file object
 */

/**
 * @typedef {Object} UploadDetails
 * @property {number} progress - Upload progress percentage (0-100)
 * @property {number} retries - Number of retry attempts
 */

export function useUploadObject () {
  const userStore = useUserStore()

  /**
   * Create a standardized upload object with 'queued' status
   *
   * @param {File} file - The file to upload
   * @param {Object} blobResult - Result from /api/blobs/new endpoint
   * @param {string} blobResult.filename - Azure filename
   * @param {Object} blobResult.blob - Blob details
   * @param {string} blobResult.blob.path - Azure blob path
   * @param {string} blobResult.blob.url - Blob URL (no SAS token)
   * @param {string} blobResult.id - Upload id from server
   * @returns {Promise<UploadObject>} Standardized upload object with 'queued' status
   */
  async function createUploadObject (file, blobResult) {
    return {
      id: blobResult.id,
      userId: userStore.userId,
      blobPath: blobResult.blob.path,
      originalFilename: file.name,
      azureFilename: blobResult.filename,
      size: file.size,
      blobUrl: blobResult.blob.url,
      upload: {
        progress: 0,
        retries: 0,
      },
      status: 'queued',
      queuedAt: new Date(),
      errors: [],
      file,
    }
  }

  return {
    createUploadObject,
  }
}
