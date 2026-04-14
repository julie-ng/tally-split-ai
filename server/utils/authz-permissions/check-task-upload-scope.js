export function checkTaskUploadScope (requestedHashId, workflowUploadHashId) {
  if (!workflowUploadHashId || requestedHashId !== workflowUploadHashId) {
    return { ok: false, reason: 'upload_scope_mismatch' }
  }
  return { ok: true }
}
