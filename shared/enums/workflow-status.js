/**
 * Workflow status - orchesterator level
 */
export const WORKFLOW_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  FAILED: 'failed',
  // Set when a run was never dequeued by a worker within its TTL (Trigger.dev
  // 'EXPIRED'). Distinguishes "the worker never picked it up" from a run that
  // actually executed and FAILED. Surfaced on load via the reconcile path.
  EXPIRED: 'expired',
}

/**
 * Workflow status - step level, e.g. OCR, annotations, split
 */
export const WORKFLOW_STEP_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  // Step intentionally did not run (a precondition wasn't met) — distinct from
  // FAILED. E.g. adjust-expense skipped because the household hasn't consented
  // to LLM analysis.
  SKIPPED: 'skipped',
}

/*
 * Generate array variants for Drizzle and Zod consumers
 */
export const WORKFLOW_STATUSES = /** @type {['queued', 'processing', 'completed', 'partial', 'failed', 'expired']} */ (Object.values(WORKFLOW_STATUS))
export const WORKFLOW_STEP_STATUSES = /** @type {['pending', 'processing', 'completed', 'failed', 'skipped']} */ (Object.values(WORKFLOW_STEP_STATUS))
