/**
 * Workflow STEP status — one value per step of a run, e.g. OCR, annotations,
 * normalize (`workflow_runs.<step>_status`).
 *
 * A step is ATOMIC: it ran, or it didn't. That's why there's no PARTIAL here —
 * partial-ness is a rollup concept that only exists at run level. Conversely
 * SKIPPED is meaningless for a run. The two enums overlap on
 * completed/processing/failed but are deliberately NOT merged: a union would
 * make half the values invalid in each context.
 *
 * Which step a status belongs to is a separate concern — see `workflow-step.js`.
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
 * Generate array variants for Drizzle enums and Zod `enum()` consumers
 */
export const WORKFLOW_STEP_STATUSES = /** @type {['pending', 'processing', 'completed', 'failed', 'skipped']} */ (Object.values(WORKFLOW_STEP_STATUS))
