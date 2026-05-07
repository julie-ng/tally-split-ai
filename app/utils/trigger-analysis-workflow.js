// Module-scope debounce: ignore duplicate calls for the same id while a
// trigger is already in flight. Server-side `workflows/[uploadId].post.js`
// is also idempotent (returns the existing run), so this is purely to avoid
// extra round-trips and stray SSE events under the upload-queue race.
const inFlight = new Set()

/**
 * Trigger the analysis workflow for an upload (fire and forget)
 *
 * @param {string} id - The upload id
 */
export function triggerAnalysisWorkflow (id) {
  if (inFlight.has(id)) {
    return
  }
  inFlight.add(id)

  $fetch(`/api/workflows/${id}`, { method: 'POST' })
    .catch((err) => {
      console.error(`❌ Failed to trigger workflow for (${id}):`, err)
    })
    .finally(() => {
      inFlight.delete(id)
    })
}
