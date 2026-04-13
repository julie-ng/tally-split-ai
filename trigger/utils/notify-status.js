import { createAuthHeaders } from './api-client.js'

const NUXT_PUBLIC_URL = process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'

/**
 * Notify the Nuxt server of a workflow step status change.
 * Fire-and-forget — errors are logged but do not fail the task.
 *
 * @param {string} runUuid - Workflow run UUID
 * @param {string} step - Workflow step name
 * @param {string} status - Step status
 * @param {Object} auth - Auth params { callbackToken, runUuid, taskId }
 */
export async function notifyStatus (runUuid, step, status, auth) {
  try {
    await fetch(`${NUXT_PUBLIC_URL}/api/workflows/callback/${runUuid}`, {
      method: 'POST',
      headers: createAuthHeaders(auth),
      body: JSON.stringify({ step, status }),
    })
  }
  catch (error) {
    console.warn(`Failed to notify status for ${runUuid}:${step}`, error)
  }
}
