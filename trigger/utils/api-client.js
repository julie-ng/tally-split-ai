const NUXT_PUBLIC_URL = process.env.NUXT_PUBLIC_URL || 'http://localhost:3000'

/**
 * Create auth headers for API calls from Trigger.dev tasks.
 *
 * @param {Object} opts
 * @param {string} opts.callbackToken - HMAC token for this workflow run
 * @param {string} opts.runUuid - Workflow run UUID
 * @param {string} opts.taskId - Task identifier (e.g. 'analyze-ocr')
 * @returns {Object} Headers object for fetch calls
 */
export function createAuthHeaders ({ callbackToken, runUuid, taskId }) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${callbackToken}`,
    'X-Workflow-Run-UUID': runUuid,
    'X-Task-Id': taskId,
  }
}

/**
 * Create an authenticated HTTP client for Trigger.dev tasks to call the Nuxt API.
 * Uses the workflow HMAC callback token as bearer auth.
 *
 * @param {Object} opts
 * @param {string} opts.callbackToken - HMAC token for this workflow run
 * @param {string} opts.runUuid - Workflow run UUID
 * @param {string} opts.taskId - Task identifier (e.g. 'analyze-ocr')
 */
export function createApiClient ({ callbackToken, runUuid, taskId }) {
  const headers = createAuthHeaders({ callbackToken, runUuid, taskId })

  async function request (method, path, body) {
    const res = await fetch(`${NUXT_PUBLIC_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await res.json()

    if (!res.ok) {
      const msg = data?.message || res.statusText
      throw new Error(`API ${method} ${path} failed (${res.status}): ${msg}`)
    }

    return data
  }

  return {
    get: path => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
  }
}

/**
 * Update workflow run status via API.
 * Convenience wrapper for the status endpoint.
 *
 * @param {Object} opts - Same as createAuthHeaders
 * @param {string} opts.callbackToken
 * @param {string} opts.runUuid
 * @param {string} opts.taskId
 * @param {Object} updates - Status fields to update
 */
export async function updateWorkflowStatus ({ callbackToken, runUuid, taskId }, updates) {
  const headers = createAuthHeaders({ callbackToken, runUuid, taskId })

  const res = await fetch(`${NUXT_PUBLIC_URL}/api/workflows/runs/${runUuid}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Workflow status update failed (${res.status}): ${data?.message || res.statusText}`)
  }

  return res.json()
}
