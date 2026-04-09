/**
 * Trigger the analysis workflow for an upload (fire and forget)
 *
 * @param {string} hashId - The upload hash ID
 */
export function triggerAnalysisWorkflow (hashId) {
  $fetch(`/api/workflows/${hashId}`, { method: 'POST' }).catch((err) => {
    console.error(`❌ Failed to trigger workflow for (${hashId}):`, err)
  })
}
