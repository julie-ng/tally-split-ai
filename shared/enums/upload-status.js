/**
 * Upload blob status — tracks the file upload lifecycle
 */
export const UPLOAD_STATUS = {
  INITIALIZED: 'initialized',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
}

/*
 * Generate array variants for Drizzle enums and Zod `enum()` consumers
 */
export const UPLOAD_STATUSES = /** @type {['initialized', 'uploaded', 'failed']} */ (Object.values(UPLOAD_STATUS))
