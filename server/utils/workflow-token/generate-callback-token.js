import crypto from 'node:crypto'
import { serializeActions } from '#shared/config/task-permissions.js'

function getSalt () {
  const salt = process.env.WORKFLOW_CALLBACK_SALT
  if (!salt) {
    throw new Error('WORKFLOW_CALLBACK_SALT environment variable is not set')
  }
  return salt
}

/**
 * Generate an HMAC callback token for workflow authentication.
 * Token is deterministic — same inputs always produce the same hash.
 *
 * HMAC input format: "${runUuid}|${runCreatedAt}|${scope}|${sortedActions}"
 *
 * @param {Object} params
 * @param {string} params.runUuid - Workflow run UUID
 * @param {string} params.runCreatedAt - Workflow run created_at as ISO timestamp string
 * @param {string} params.scope - Resource scope (e.g. "upload:abc123", "receipt:123")
 * @param {string[]} params.actions - Task actions (e.g. ['upload:read', 'receipt:write'])
 * @returns {string} Hex-encoded HMAC token
 */
export function generateCallbackToken ({ runUuid, runCreatedAt, scope, actions }) {
  if (!scope || !actions?.length) {
    throw new Error('scope and actions are required for token generation')
  }
  const input = `${runUuid}|${runCreatedAt}|${scope}|${serializeActions(actions)}`
  return crypto.createHmac('sha256', getSalt()).update(input).digest('hex')
}
