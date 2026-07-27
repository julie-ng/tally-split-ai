/**
 * Workflow RUN status — orchestrator level. One value per workflow run
 * (`workflow_runs.status`), describing the run as a whole.
 *
 * Think of these as HTTP status CLASSES — they describe the technical outcome
 * of a run, never whether a human should look at it:
 *
 *   2xx (ran to the end, expense exists) — COMPLETED, PARTIAL
 *   non-2xx (no usable result)           — FAILED, EXPIRED
 *   in-flight                            — QUEUED, PROCESSING
 *
 * ⚠️ "Needs review" is a DIFFERENT, human-facing concept derived at the EXPENSE
 * level (LLM confidence + paidByMatch + partial). Don't label these with it.
 *
 * A run is an AGGREGATE over steps, which is why it has values a step can't
 * have (PARTIAL = "my parts disagree"). The step-level vocabulary lives in
 * `workflow-step-status.js` — deliberately a separate enum, not a superset.
 */
export const WORKFLOW_RUN_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  // The run FINISHED but >= 1 non-fatal step failed (HTTP 206 in spirit). Only
  // OCR is fatal; annotations/normalize/createExpense/adjustExpense degrade, so
  // an expense still exists. Contrast FAILED, where OCR died and there is no
  // receipt or expense at all. Set by the orchestrator via `hasStepErrors`.
  //
  // A SKIPPED step does NOT produce PARTIAL — skipping (e.g. no LLM consent) is
  // an intentional non-run, not a failure.
  PARTIAL: 'partial',
  FAILED: 'failed',
  // Set when a run was never dequeued by a worker within its TTL (Trigger.dev
  // 'EXPIRED'). Distinguishes "the worker never picked it up" from a run that
  // actually executed and FAILED. Surfaced on load via the reconcile path.
  EXPIRED: 'expired',
}

/*
 * Generate array variants for Drizzle enums and Zod `enum()` consumers
 */
export const WORKFLOW_RUN_STATUSES = /** @type {['queued', 'processing', 'completed', 'partial', 'failed', 'expired']} */ (Object.values(WORKFLOW_RUN_STATUS))
