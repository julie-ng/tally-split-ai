/**
 * Check if a task can access an upload by hashId.
 * @param {string} requestedHashId - hashId from the request
 * @param {string|null} workflowUploadHashId - hashId from workflowRun.upload
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkTaskUploadScope (requestedHashId, workflowUploadHashId) {
  if (!workflowUploadHashId || requestedHashId !== workflowUploadHashId) {
    return { ok: false, reason: 'upload_scope_mismatch' }
  }
  return { ok: true }
}
