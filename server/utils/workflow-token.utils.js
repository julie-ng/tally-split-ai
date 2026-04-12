import crypto from 'node:crypto'

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
 * HMAC input format: "${runUuid}|${runCreatedAt}|${scope}"
 * Uses '|' as field separator so scope values can use ':' freely
 * (e.g. "upload:abc123", "receipt:123").
 *
 * @param {Object} params
 * @param {string} params.runUuid - Workflow run UUID
 * @param {string} params.runCreatedAt - Workflow run created_at as ISO timestamp string
 * @param {string} params.scope - Resource scope (e.g. "upload:abc123", "receipt:123")
 * @returns {string} Hex-encoded HMAC token
 */
export function generateCallbackToken ({ runUuid, runCreatedAt, scope }) {
  if (!scope) {
    throw new Error('scope is required for token generation')
  }
  const input = `${runUuid}|${runCreatedAt}|${scope}`
  return crypto.createHmac('sha256', getSalt()).update(input).digest('hex')
}

/**
 * Verify an HMAC callback token by recomputing from known values.
 *
 * @param {string} token - The token to verify
 * @param {Object} params
 * @param {string} params.runUuid - Workflow run UUID
 * @param {string} params.runCreatedAt - Workflow run created_at as ISO timestamp string
 * @param {string} params.scope - Resource scope (must match what was used to generate)
 * @returns {boolean} True if token is valid
 */
export function verifyCallbackToken (token, { runUuid, runCreatedAt, scope }) {
  const expected = generateCallbackToken({ runUuid, runCreatedAt, scope })
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
}

/**
 * Check whether a workflow token has expired based on the workflow run's createdAt.
 *
 * @param {Date} createdAt - Workflow run created_at timestamp
 * @param {number} [expiryMinutes] - Validity window in minutes (defaults to WORKFLOW_TOKEN_EXPIRY_MINUTES env var, or 15)
 * @returns {{ expired: boolean, expiredAt: Date }} Whether the token is expired and when it expires/expired
 */
export function isTokenExpired (createdAt, expiryMinutes) {
  const minutes = expiryMinutes ?? parseInt(process.env.WORKFLOW_TOKEN_EXPIRY_MINUTES ?? '15', 10)
  const expiredAt = new Date(createdAt.getTime() + minutes * 60 * 1000)
  return {
    expired: Date.now() > expiredAt.getTime(),
    expiredAt,
  }
}
