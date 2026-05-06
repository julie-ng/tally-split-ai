/**
 * Check if a task can access an upload by id.
 * @param {string} requestedId - upload id from the request
 * @param {string|null} workflowUploadId - id from workflowRun.upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskUploadScope (requestedId, workflowUploadId) {
  if (!workflowUploadId || requestedId !== workflowUploadId) {
    return { ok: false, reason: 'upload_scope_mismatch' }
  }
  return { ok: true }
}
