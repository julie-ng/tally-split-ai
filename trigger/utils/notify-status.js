const NUXT_PUBLIC_URL = process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'

/**
 * Notify the Nuxt server of a workflow step status change.
 * Fire-and-forget — errors are logged but do not fail the task.
 */
export async function notifyStatus (runUuid, step, status, callbackToken) {
  try {
    await fetch(`${NUXT_PUBLIC_URL}/api/workflow/callback/${runUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, status, callbackToken }),
    })
  }
  catch (error) {
    console.warn(`Failed to notify status for ${runUuid}:${step}`, error)
  }
}
