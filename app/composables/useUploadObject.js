import {
  extractReceiptDate,
  extractReceiptTotal,
  extractHashtagsForAzureBlobs,
} from '~~/shared/utils/filename.utils'

import { useUserStore } from '~/stores/user.store'

/**
 * Extract Azure blob tags from filename and user context
 * @param {string} filename - The filename to extract tags from
 * @param {string} userId - The user ID
 * @returns {Object} Object with tag keys and values for Azure
 */
function extractAzureBlobTags (filename, userId) {
  const tags = {}

  // Add user ID tag
  if (userId) {
    tags['user-id'] = userId
  }

  const receiptDate = extractReceiptDate(filename)
  if (receiptDate) {
    tags['receipt-date'] = receiptDate
  }

  const receiptTotal = extractReceiptTotal(filename)
  if (receiptTotal) {
    tags['receipt-total'] = receiptTotal
  }

  const hashtags = extractHashtagsForAzureBlobs(filename)
  if (hashtags) {
    tags['receipt-tags'] = hashtags
  }

  return tags
}

/**
 * @typedef {Object} UploadObject
 * @property {string} hashId - Unique hash identifier
 * @property {string} userId - User ID (blob path prefix)
 * @property {string} blobPath - Azure blob path (e.g. userId/filename)
 * @property {string} originalFilename - Original file name
 * @property {string} azureFilename - Azure blob filename
 * @property {number} size - File size in bytes
 * @property {string} blobUrl - Azure blob URL
 * @property {Object} azureTags - Azure blob index tags extracted from filename
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
   * @param {string} blobResult.hashId - Unique hash identifier from server
   * @returns {Promise<UploadObject>} Standardized upload object with 'queued' status
   */
  async function createUploadObject (file, blobResult) {
    const azureTags = extractAzureBlobTags(file.name, userStore.userId)

    return {
      hashId: blobResult.hashId,
      userId: userStore.userId,
      blobPath: blobResult.blob.path,
      originalFilename: file.name,
      azureFilename: blobResult.filename,
      size: file.size,
      blobUrl: blobResult.blob.url,
      azureTags,
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
