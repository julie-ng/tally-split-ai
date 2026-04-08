import crypto from 'node:crypto'

function getSalt () {
  const salt = process.env.WORKFLOW_CALLBACK_SALT
  if (!salt) {
    throw new Error('WORKFLOW_CALLBACK_SALT environment variable is not set')
  }
  return salt
}

/**
 * Generate an HMAC callback token for workflow status callbacks.
 * Token is deterministic — same inputs always produce the same hash.
 *
 * @param {Object} params
 * @param {number} params.runUuid - Workflow run UUID
 * @param {string} params.runCreatedAt - Workflow run created_at as ISO timestamp string
 * @param {string} params.blobUrl - Upload blob URL
 * @returns {string} Hex-encoded HMAC token
 */
export function generateCallbackToken ({ runUuid, runCreatedAt, blobUrl }) {
  const input = `${runUuid}:${runCreatedAt}:${blobUrl}`
  return crypto.createHmac('sha256', getSalt()).update(input).digest('hex')
}

/**
 * Verify an HMAC callback token by recomputing from known values.
 *
 * @param {string} token - The token to verify
 * @param {Object} params
 * @param {number} params.runUuid - Workflow run UUID
 * @param {string} params.runCreatedAt - Workflow run created_at as ISO timestamp string
 * @param {string} params.blobUrl - Upload blob URL
 * @returns {boolean} True if token is valid
 */
export function verifyCallbackToken (token, { runUuid, runCreatedAt, blobUrl }) {
  const expected = generateCallbackToken({ runUuid, runCreatedAt, blobUrl })
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
}
