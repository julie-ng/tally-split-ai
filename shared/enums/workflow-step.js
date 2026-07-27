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
 * ⚠️ No plural array of this enum — deliberately.
 *
 * The `*_STATUSES` arrays elsewhere in this directory exist for exactly two
 * consumers: Drizzle `text({ enum })` columns and Zod `z.enum()`. WORKFLOW_STEP
 * backs NEITHER — it's not a column. Its values are jsonb keys in
 * `workflow_runs.errors` and lookup keys in code, so a plural would be symmetry
 * for its own sake. (One existed, `WORKFLOW_STEPS`, with zero importers. Deleted.)
 *
 * WORKFLOW_STEP_REGISTRY below is NOT that plural: it excludes ORCHESTRATOR
 * (not a step), it is ORDERED (pipeline sequence), and it carries display metadata.
 */

/**
 * The five real pipeline steps, in execution order — the single source of truth
 * for "what are the steps, what are they called, and which columns hold them".
 *
 * Derived from `key`, which is the `workflow_runs` column base:
 *   `${key}Status` `${key}StartedAt` `${key}CompletedAt`  → camelCase (Drizzle)
 *   also the jsonb error key in `workflow_runs.errors`
 *
 * Excludes:
 *   - ORCHESTRATOR — run-level, not a step
 *   - "Upload" — the timeline/bubbles show an Upload circle FIRST, but it is a
 *     pseudo-step: its status comes from the upload row, and it has no
 *     workflow_runs column, no error key and no timestamps. Callers that display
 *     it prepend it themselves.
 *
 * TODO: `label` (compact, for the bubbles row) and `timelineLabel` (roomier, for
 * the preview timeline) may be reducible to one — revisit. Also settles the
 * 'Create Expense' vs 'Create expense' casing inconsistency between the two.
 *
 * Adding a 6th step? Add it here, then: schema.ts columns + a migration, and the
 * Zod field lists in workflow-run.schema.js (both need literals — they can't
 * derive from this).
 */
export const WORKFLOW_STEP_REGISTRY = [
  {
    key: WORKFLOW_STEP.OCR,
    label: 'OCR',
    timelineLabel: 'OCR Analysis',
    description: 'Text extraction (Azure Document Intelligence)',
  },
  {
    key: WORKFLOW_STEP.ANNOTATIONS,
    label: 'Annotations',
    timelineLabel: 'Handwritten analysis',
    description: 'Detecting initials, circles, strikethroughs (GPT-4o)',
  },
  {
    key: WORKFLOW_STEP.NORMALIZE,
    label: 'Normalize',
    timelineLabel: 'Normalize',
    description: 'Cleaning date, title, filename',
  },
  {
    key: WORKFLOW_STEP.EXPENSE,
    label: 'Create Expense',
    timelineLabel: 'Create expense',
    description: 'Expense from receipt total',
  },
  {
    key: WORKFLOW_STEP.ADJUST_EXPENSE,
    label: 'Adjust Expense',
    timelineLabel: 'Adjust expense',
    description: 'Asymmetric split from annotations',
  },
]

/**
 * Step column bases in pipeline order, e.g. ['ocr', 'annotations', …].
 * Convenience for code that only needs the keys.
 */
export const WORKFLOW_STEP_KEYS = WORKFLOW_STEP_REGISTRY.map(step => step.key)
