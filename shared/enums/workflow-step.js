/**
 * Workflow step names — used both as SSE event step identifiers and as
 * keys in `workflow_runs.errors` (jsonb).
 *
 * The orchestrator's own errors are keyed under `_orchestrator`. The
 * leading underscore distinguishes orchestrator-level failures from
 * per-step ones (`ocr`, `annotations`, etc.) and is stable across task
 * renames — describes the role, not the implementation.
 */
export const WORKFLOW_STEP = {
  OCR: 'ocr',
  ANNOTATIONS: 'annotations',
  NORMALIZE: 'normalize',
  EXPENSE: 'createExpense',
  ADJUST_EXPENSE: 'adjustExpense',
  ORCHESTRATOR: '_orchestrator',
}

export const WORKFLOW_STEPS = /** @type {const} */ (Object.values(WORKFLOW_STEP))
