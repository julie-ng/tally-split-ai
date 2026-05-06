/**
 * Trigger the analysis workflow for an upload (fire and forget)
 *
 * @param {string} id - The upload id
 */
export function triggerAnalysisWorkflow (id) {
  $fetch(`/api/workflows/${id}`, { method: 'POST' }).catch((err) => {
    console.error(`❌ Failed to trigger workflow for (${id}):`, err)
  })
}
