export const UPLOAD_ANALYSIS_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

// Array form for Drizzle enum columns and Zod z.enum()
export const UPLOAD_ANALYSIS_STATUSES = /** @type {['pending', 'queued', 'processing', 'completed', 'failed']} */ (Object.values(UPLOAD_ANALYSIS_STATUS))
