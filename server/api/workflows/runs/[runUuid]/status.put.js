import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { WORKFLOW_RUN_STATUS, WORKFLOW_RUN_STATUSES } from '#shared/enums/workflow-run-status.js'
import { WORKFLOW_STEP_STATUSES, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'
import { WORKFLOW_STEP_KEYS } from '#shared/enums/workflow-step.js'

const TERMINAL_STEP_STATUSES = new Set([
  WORKFLOW_STEP_STATUS.COMPLETED,
  WORKFLOW_STEP_STATUS.FAILED,
  WORKFLOW_STEP_STATUS.SKIPPED,
])

/**
 * Given a step's new status, return the timestamp field to stamp with `now`.
 *   → processing  ⇒ <step>StartedAt
 *   → terminal    ⇒ <step>CompletedAt   (completed / failed / skipped)
 *   → pending     ⇒ nothing (a step reset back to pending clears nothing here)
 *
 * @param {string} stepBase - e.g. 'ocr', 'createExpense'
 * @param {string} status - a WORKFLOW_STEP_STATUS value
 * @returns {string|null} the timestamp field name, or null if no stamp applies
 */
function stampFieldFor (stepBase, status) {
  if (status === WORKFLOW_STEP_STATUS.PROCESSING) {
    return `${stepBase}StartedAt`
  }
  if (TERMINAL_STEP_STATUSES.has(status)) {
    return `${stepBase}CompletedAt`
  }
  return null
}

const statusUpdateSchema = z.object({
  // Orchestrator-level status
  status: z.enum(WORKFLOW_RUN_STATUSES).optional(),

  // Per-step statuses
  ocrStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  annotationsStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  createExpenseStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  adjustExpenseStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  normalizeStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),

  // Per-step errors to merge into the workflow_runs.errors jsonb column.
  // Shape: { [stepKey]: errorMessage }. Keys: WORKFLOW_STEP values
  // (e.g. ocr, annotations, adjustSplit, _orchestrator).
  errors: z.record(z.string(), z.string()).optional(),
  completedAt: z.string().datetime().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)

  const runUuid = getRouterParam(event, 'runUuid')
  if (!runUuid) {
    throw createError({ statusCode: 400, message: 'Missing runUuid parameter' })
  }

  // Verify the authenticated task owns this workflow run
  if (event.context.workflowRun?.uuid !== runUuid) {
    logSecurityEvent(event, 'warn', { runUuid, reason: 'run_uuid_mismatch' }, 'Workflow status update rejected')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const result = await readValidatedBody(event, body => statusUpdateSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const workflowUpdates = result.data

  // A terminal run status means the pipeline is done with this upload — that's
  // what stamps analyzedAt below. Previously the orchestrator sent an explicit
  // analysisStatus alongside; that rollup column is gone, so derive it.
  const isAnalyzed = workflowUpdates.status === WORKFLOW_RUN_STATUS.COMPLETED
    || workflowUpdates.status === WORKFLOW_RUN_STATUS.PARTIAL

  const workflowRun = event.context.workflowRun

  // Build workflow run updates (only include fields that were provided)
  const runUpdates = {}
  if (workflowUpdates.status !== undefined) runUpdates.status = workflowUpdates.status
  if (workflowUpdates.completedAt !== undefined) runUpdates.completedAt = workflowUpdates.completedAt ? new Date(workflowUpdates.completedAt) : null

  // Per-step status writes, plus their server-derived timestamp. Each PUT
  // carries at most one step's status transition; we stamp the matching
  // started/completed column from the transition itself (see stampFieldFor).
  const now = new Date()
  for (const stepBase of WORKFLOW_STEP_KEYS) {
    const statusField = `${stepBase}Status`
    const value = workflowUpdates[statusField]
    if (value === undefined) continue

    runUpdates[statusField] = value
    const stampField = stampFieldFor(stepBase, value)
    if (stampField) {
      runUpdates[stampField] = now
    }
  }

  // Merge per-step errors into the existing jsonb column. Read-modify-write
  // is acceptable here because each task writes one key and steps don't
  // contend for the same key in practice.
  if (workflowUpdates.errors !== undefined) {
    const [existing] = await db
      .select({ errors: schema.workflowRuns.errors })
      .from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.id, workflowRun.id))
      .limit(1)
    runUpdates.errors = { ...(existing?.errors ?? {}), ...workflowUpdates.errors }
  }

  // Update workflow run if there are fields to update
  if (Object.keys(runUpdates).length > 0) {
    await db
      .update(schema.workflowRuns)
      .set(runUpdates)
      .where(eq(schema.workflowRuns.id, workflowRun.id))

    log.info({ runUuid, ...runUpdates }, 'Workflow run status updated')
  }

  // Stamp when the pipeline finished analyzing this upload. The coarse
  // `analysisStatus` rollup it used to accompany was dropped (nothing read it —
  // run/step status is the source of truth); `analyzedAt` stays because it
  // records WHEN, which workflow_runs doesn't carry per-upload.
  if (isAnalyzed) {
    await db
      .update(schema.uploads)
      .set({ analyzedAt: new Date() })
      .where(eq(schema.uploads.id, workflowRun.uploadId))

    log.info({ runUuid, uploadId: workflowRun.uploadId }, 'Upload analyzedAt stamped')
  }

  return { success: true }
})
