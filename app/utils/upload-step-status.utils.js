import { UPLOAD_STATUS } from '#shared/enums/upload-status.js'
import { UPLOAD_QUEUE_STATUS } from '#shared/enums/upload-queue-status.js'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'

/**
 * Translate an upload row's status into a WORKFLOW_STEP_STATUS, for rendering
 * the "Upload" pseudo-step (the first circle in the bubbles row / timeline).
 *
 * Why this accepts two vocabularies: `pages/uploads/index.vue` MERGES in-flight
 * client queue rows with DB rows into one list, and the queue row's status wins
 * while it exists. So a row's `status` here may be either an UPLOAD_STATUS (DB)
 * or an UPLOAD_QUEUE_STATUS (client). They collide on 'failed', so the shared
 * cases below are deliberately listed once.
 *
 * Upload is NOT a real pipeline step — it has no workflow_runs column, no
 * errorKey and no per-step timestamps. This function exists purely so it can be
 * DISPLAYED alongside the real steps.
 *
 * @param {string} status - an UPLOAD_STATUS or UPLOAD_QUEUE_STATUS value
 * @returns {string} a WORKFLOW_STEP_STATUS value
 */
export function uploadStepStatus (status) {
  switch (status) {
    // Bytes are in Azure. UPLOAD_STATUS.UPLOADED ('uploaded') and
    // UPLOAD_QUEUE_STATUS.COMPLETED ('completed') are the same moment in the
    // two vocabularies — different words, so both are listed.
    case UPLOAD_STATUS.UPLOADED:
    case UPLOAD_QUEUE_STATUS.COMPLETED:
      return WORKFLOW_STEP_STATUS.COMPLETED

    case UPLOAD_QUEUE_STATUS.IN_PROGRESS:
      return WORKFLOW_STEP_STATUS.PROCESSING

    // UPLOAD_STATUS.FAILED and UPLOAD_QUEUE_STATUS.FAILED share the literal
    // 'failed', so one case covers both. INTERRUPTED (page closed mid-transfer)
    // also renders as failed — the job can never finish.
    case UPLOAD_STATUS.FAILED:
    case UPLOAD_QUEUE_STATUS.INTERRUPTED:
      return WORKFLOW_STEP_STATUS.FAILED

    // UPLOAD_STATUS.INITIALIZED (row exists, no blob) and
    // UPLOAD_QUEUE_STATUS.QUEUED (awaiting a slot) both mean "not started".
    default:
      return WORKFLOW_STEP_STATUS.PENDING
  }
}
