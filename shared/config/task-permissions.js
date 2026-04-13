/**
 * Task permissions map — single source of truth for what each Trigger.dev task
 * is allowed to do via the API. Format: 'resource:permission'.
 *
 * Used by:
 * - Orchestrator: to generate per-task HMAC tokens (actions baked into hash)
 * - Server: to verify HMAC tokens and check endpoint permissions
 *
 * Import paths:
 * - From server/: import { getTaskActions } from '~~/shared/config/task-permissions.js'
 * - From trigger/: import { getTaskActions } from '../shared/config/task-permissions.js'
 */

export const VALID_RESOURCES = ['upload', 'receipt', 'split', 'workflow']
export const VALID_PERMISSIONS = ['read', 'write', 'delete']

export const TASK_PERMISSIONS = {
  'receipt-workflow': ['workflow:read', 'workflow:write'],
  'analyze-ocr': ['receipt:read', 'receipt:write', 'upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'analyze-annotations': ['upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'create-split': ['receipt:read', 'receipt:write', 'split:write', 'workflow:read', 'workflow:write'],
}

/**
 * Get the sorted actions array for a task.
 * @param {string} taskId - Trigger.dev task ID
 * @returns {string[]} Sorted array of 'resource:permission' strings
 * @throws {Error} If taskId is not in the permissions map
 */
export function getTaskActions (taskId) {
  const actions = TASK_PERMISSIONS[taskId]
  if (!actions) {
    throw new Error(`Unknown task ID: ${taskId}`)
  }
  return [...actions].sort()
}

/**
 * Serialize an actions array into a deterministic string for HMAC input.
 * Sorts alphabetically and joins with comma.
 * @param {string[]} actions - Array of 'resource:permission' strings
 * @returns {string} Comma-separated sorted actions
 */
export function serializeActions (actions) {
  for (const action of actions) {
    const [resource, permission] = action.split(':')
    if (!VALID_RESOURCES.includes(resource) || !VALID_PERMISSIONS.includes(permission)) {
      throw new Error(`Invalid action format: '${action}' — expected 'resource:permission'`)
    }
  }
  return [...actions].sort().join(',')
}
