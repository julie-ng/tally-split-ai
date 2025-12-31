import { simpleHash } from '~~/shared/utils/filename.helper'

/**
 * @typedef {Object} UploadObject
 * @property {string} hashId - Unique hash identifier
 * @property {string} originalFilename - Original file name
 * @property {string} azureFilename - Azure blob filename
 * @property {number} size - File size in bytes
 * @property {string} blobUrl - Azure blob URL
 * @property {UploadDetails} upload - Upload details
 * @property {'queued'|'in-progress'|'completed'|'failed'} status - Upload status
 * @property {Date} queuedAt - When upload was queued
 * @property {File} file - The actual file object
 */

/**
 * @typedef {Object} UploadDetails
 * @property {string} url - Upload URL with SAS token
 * @property {string} expiresAt - SAS token expiration timestamp
 * @property {number} progress - Upload progress percentage (0-100)
 */

export function useUploadObject() {
  /**
   * Create a standardized upload object with 'queued' status
   * @param {File} file - The file to upload
   * @param {Object} blobResult - Result from /api/blobs/new endpoint
   * @param {string} blobResult.filename - Azure filename
   * @param {Object} blobResult.blob - Blob details
   * @param {string} blobResult.blob.url - Blob URL
   * @param {string} blobResult.blob.uploadUrl - Upload URL with SAS token
   * @param {string} blobResult.blob.uploadExpiresAt - SAS token expiration
   * @returns {UploadObject} Standardized upload object with 'queued' status
   */
  function createUploadObject(file, blobResult) {
    const hashId = simpleHash(file.name)
    
    return {
      hashId,
      originalFilename: file.name,
      azureFilename: blobResult.filename,
      size: file.size,
      blobUrl: blobResult.blob.url,
      upload: {
        url: blobResult.blob.uploadUrl,
        expiresAt: blobResult.blob.uploadExpiresAt,
        progress: 0
      },
      status: 'queued',
      queuedAt: new Date(),
      file
    }
  }

  return {
    createUploadObject
  }
}
