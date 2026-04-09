/**
 * Upload blob status — tracks the file upload lifecycle
 */
export const UPLOAD_STATUS = {
  INITIALIZED: 'initialized',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
}

export const UPLOAD_STATUSES = /** @type {['initialized', 'uploaded', 'failed']} */ (Object.values(UPLOAD_STATUS))
