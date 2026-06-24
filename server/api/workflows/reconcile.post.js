import { runs } from '@trigger.dev/sdk/v3'
import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import { WORKFLOW_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '#shared/enums/upload-analysis-status.js'
import { mapTriggerStatusToWorkflowStatus } from '#shared/utils/workflow/trigger-status-map.utils.js'

/**
 * Reconcile stuck workflow runs against Trigger.dev's source of truth.
 *
 * A run that no worker ever dequeues (e.g. worker offline) stays 'queued'
 * forever — our callback never fires, so nothing locally moves it off that
 * status. Trigger.dev itself knows the real state (EXPIRED once the TTL passes,
 * CRASHED, etc.). This endpoint pulls that state for runs that look stuck and
 * flips them to a terminal status the UI can act on (retry).
 *
 * Called on /uploads load. Deliberately conservative:
 *  - Only inspects runs still 'queued'/'processing' with a triggerRunId AND
 *    older than the TTL window (don't hammer Trigger for fresh, in-flight runs).
 *  - Only writes terminal-FAILURE states (EXPIRED/FAILED) — never synthesizes
 *    success; the workflow callback remains the source of truth for results.
 *  - A Trigger API failure for one run is logged and skipped, never fatal.
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

  // How long a run may sit active before we ask Trigger what's really going on.
  // Deliberately shorter than the token TTL (15m): a real workflow finishes in
  // well under 5 min, so a run still active past this is a signal something is
  // off (no worker, stuck downstream API) — and the answer is worth fetching
  // before the token even expires. Conservative; tune if real runs run longer.
  const STALE_AFTER_MINUTES = 5
  const staleBefore = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000)

  // Candidate stuck runs in this household: still active, have a Trigger run
  // id to look up, and old enough to be suspicious.
  const candidates = await db
    .select({
      id: schema.workflowRuns.id,
      uploadId: schema.workflowRuns.uploadId,
      triggerRunId: schema.workflowRuns.triggerRunId,
      errors: schema.workflowRuns.errors,
    })
    .from(schema.workflowRuns)
    .innerJoin(schema.uploads, eq(schema.workflowRuns.uploadId, schema.uploads.id))
    .where(and(
      eq(schema.uploads.householdId, householdId),
      inArray(schema.workflowRuns.status, [WORKFLOW_STATUS.QUEUED, WORKFLOW_STATUS.PROCESSING]),
      isNotNull(schema.workflowRuns.triggerRunId),
      lt(schema.workflowRuns.createdAt, staleBefore),
    ))

  let reconciledCount = 0

  for (const run of candidates) {
    let triggerRun
    try {
      triggerRun = await runs.retrieve(run.triggerRunId)
    }
    catch (err) {
      // Trigger API unreachable ≠ our run failed. Leave it; try again next load.
      log.warn({ triggerRunId: run.triggerRunId, error: err.message }, 'Reconcile: could not retrieve Trigger run')
      continue
    }

    const mapped = mapTriggerStatusToWorkflowStatus(triggerRun?.status)
    if (!mapped) {
      continue
    }

    const message = mapped === WORKFLOW_STATUS.EXPIRED
      ? 'Workflow expired before any worker started it (no worker available, or it did not start in time).'
      : `Workflow ended without completing (Trigger status: ${triggerRun.status}).`

    await db
      .update(schema.workflowRuns)
      .set({
        status: mapped,
        completedAt: new Date(),
        errors: { ...(run.errors ?? {}), [WORKFLOW_STEP.ORCHESTRATOR]: message },
      })
      .where(eq(schema.workflowRuns.id, run.id))

    await db
      .update(schema.uploads)
      .set({ analysisStatus: UPLOAD_ANALYSIS_STATUS.FAILED })
      .where(eq(schema.uploads.id, run.uploadId))

    log.info({ workflowRunId: run.id, triggerRunId: run.triggerRunId, status: mapped }, 'Reconcile: stuck run finalized')
    reconciledCount++
  }

  return { success: true, reconciled: reconciledCount }
})
