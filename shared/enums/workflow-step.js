/**
 * Workflow step names — used as keys in `workflow_runs.errors` (jsonb).
 *
 * The orchestrator's own errors are keyed under `_orchestrator`. The
 * leading underscore distinguishes orchestrator-level failures from
 * per-step ones (`ocr`, `annotations`, etc.) and is stable across task
 * renames — describes the role, not the implementation.
 *
 * ⚠️ The VALUES (not the keys) match the `workflow_runs` column bases:
 * `createExpense` → `create_expense_status` / `create_expense_started_at`.
 * Anything deriving column names must key off the value.
 */
export const WORKFLOW_STEP = {
  OCR: 'ocr',
  ANNOTATIONS: 'annotations',
  NORMALIZE: 'normalize',
  EXPENSE: 'createExpense',
  ADJUST_EXPENSE: 'adjustExpense',
  ORCHESTRATOR: '_orchestrator',
}

/*
 * ⚠️ No array variant here — deliberately.
 *
 * The `*_STATUSES` arrays elsewhere in this directory exist for exactly two
 * consumers: Drizzle `text({ enum })` columns and Zod `z.enum()`. WORKFLOW_STEP
 * backs NEITHER — it's not a column. Its values are jsonb keys in
 * `workflow_runs.errors` and lookup keys in code, so a plural would be symmetry
 * for its own sake. (One existed, `WORKFLOW_STEPS`, with zero importers. Deleted.)
 *
 * A `WORKFLOW_STEP_REGISTRY` array IS coming here — the ordered list of the five
 * real pipeline steps with their labels/descriptions, to replace the step lists
 * currently hand-copied across status.put.js, workflow.store.js,
 * useUploadPreview.js and TableWorkflowBubbles.vue. Note it is NOT a plural of
 * this enum: it excludes ORCHESTRATOR (not a step) and carries display metadata.
 */
