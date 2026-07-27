export const UPLOAD_ANALYSIS_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

/*
 * Generate array variants for Drizzle enums and Zod `enum()` consumers
 */
export const UPLOAD_ANALYSIS_STATUSES = /** @type {['pending', 'queued', 'processing', 'completed', 'failed']} */ (Object.values(UPLOAD_ANALYSIS_STATUS))
