/**
 * Task permissions map — single source of truth for what each Trigger.dev task
 * is allowed to do via the API. Format: 'resource:permission'.
 *
 * Used by:
 * - Server: to verify HMAC tokens, check endpoint permissions, and generate per-task tokens
 * - TASK_CHILDREN defines which child tasks each orchestrator may request tokens for
 *
 * Import paths:
 * - From server/: import { getTaskActions } from '~~/shared/config/task-permissions.js'
 * - From trigger/: import { getTaskActions } from '../shared/config/task-permissions.js'
 */

export const VALID_RESOURCES = ['upload', 'receipt', 'split', 'workflow']
export const VALID_PERMISSIONS = ['read', 'write', 'delete']

export const TASK_PERMISSIONS = {
  'receipt-workflow': ['receipt:read', 'receipt:write', 'upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'analyze-ocr': ['upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'analyze-annotations': ['upload:read', 'upload:write', 'workflow:read', 'workflow:write'],
  'create-split': ['receipt:read', 'receipt:write', 'split:write', 'workflow:read', 'workflow:write'],
  'normalize-receipt': ['receipt:read', 'receipt:write', 'upload:read', 'workflow:read', 'workflow:write'],
}

/**
 * Child task policy — defines which tasks each orchestrator is allowed to
 * generate tokens for via POST /api/workflows/runs/:runUuid/tokens.
 */
export const TASK_CHILDREN = {
  'receipt-workflow': ['analyze-ocr', 'analyze-annotations', 'create-split', 'normalize-receipt'],
}

/**
 * Get the allowed child task IDs for an orchestrator.
 * @param {string} taskId - Orchestrator task ID
 * @returns {string[]} Array of child task IDs
 * @throws {Error} If taskId has no children defined
 */
export function getTaskChildren (taskId) {
  const children = TASK_CHILDREN[taskId]
  if (!children) {
    throw new Error(`Task '${taskId}' is not allowed to generate child tokens`)
  }
  return children
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
