import { WORKFLOW_STATUS } from '#shared/enums/workflow-status.js'

/**
 * Trigger.dev run statuses that mean the run reached a terminal state WITHOUT
 * our callback ever finalizing it — i.e. the run never ran, or died in a way
 * the orchestrator couldn't report. These are the states the on-load reconcile
 * cares about.
 *
 * @see https://trigger.dev/docs/runs (run statuses)
 */
const TRIGGER_TERMINAL_FAILURE = {
  EXPIRED: WORKFLOW_STATUS.EXPIRED, // never dequeued within TTL — "no worker"
  TIMED_OUT: WORKFLOW_STATUS.FAILED,
  CRASHED: WORKFLOW_STATUS.FAILED,
  SYSTEM_FAILURE: WORKFLOW_STATUS.FAILED,
  FAILED: WORKFLOW_STATUS.FAILED,
  CANCELED: WORKFLOW_STATUS.FAILED,
}

/**
 * Map a Trigger.dev run status to one of our WORKFLOW_STATUS values, for the
 * on-load reconcile path.
 *
 * Returns a status ONLY for terminal-failure Trigger states — the cases our
 * own callback can never report because the run didn't run (or crashed outside
 * the orchestrator's try/catch). Returns `null` for everything else:
 *  - in-flight states (QUEUED/EXECUTING/…): the run may still finish; leave it.
 *  - COMPLETED: never synthesize success here — our callback is the source of
 *    truth for the per-step results; a COMPLETED Trigger run with a stale local
 *    row is a separate (SSE-race) concern, not a failure to surface.
 *
 * @param {string} triggerStatus - Trigger.dev run.status (e.g. 'EXPIRED')
 * @returns {string|null} A WORKFLOW_STATUS value, or null to leave unchanged.
 */
export function mapTriggerStatusToWorkflowStatus (triggerStatus) {
  if (!triggerStatus) {
    return null
  }
  return TRIGGER_TERMINAL_FAILURE[triggerStatus] ?? null
}
