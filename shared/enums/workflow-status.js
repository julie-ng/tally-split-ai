/**
 * Workflow status - orchesterator level
 */
export const WORKFLOW_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

/**
 * Workflow status - step level, e.g. OCR, annotations, split
 */
export const WORKFLOW_STEP_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

/*
 * Generate array variants for Drizzle and Zod consumers
 */
export const WORKFLOW_STATUSES = /** @type {['queued', 'processing', 'completed', 'failed']} */ (Object.values(WORKFLOW_STATUS))
export const WORKFLOW_STEP_STATUSES = /** @type {['pending', 'processing', 'completed', 'failed']} */ (Object.values(WORKFLOW_STEP_STATUS))
