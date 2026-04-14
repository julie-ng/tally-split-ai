import crypto from 'node:crypto'
import { generateCallbackToken } from './generate-callback-token.js'

/**
 * Verify an HMAC callback token by recomputing from known values.
 *
 * @param {string} token - The token to verify
 * @param {Object} params
 * @param {string} params.runUuid - Workflow run UUID
 * @param {string} params.runCreatedAt - Workflow run created_at as ISO timestamp string
 * @param {string} params.scope - Resource scope (must match what was used to generate)
 * @param {string[]} params.actions - Task actions (must match what was used to generate)
 * @returns {boolean} True if token is valid
 */
export function verifyCallbackToken (token, { runUuid, runCreatedAt, scope, actions }) {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    return false
  }
  const expected = generateCallbackToken({ runUuid, runCreatedAt, scope, actions })
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
}
