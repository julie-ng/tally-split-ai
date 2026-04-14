/**
 * Check whether a workflow token has expired based on the workflow run's createdAt.
 *
 * @param {Date} createdAt - Workflow run created_at timestamp
 * @param {number} [expiryMinutes] - Validity window in minutes (defaults to WORKFLOW_TOKEN_EXPIRY_MINUTES env var, or 15)
 * @returns {{ expired: boolean, expiredAt: Date }} Whether the token is expired and when it expires/expired
 */
export function isTokenExpired (createdAt, expiryMinutes) {
  const parsed = expiryMinutes ?? parseInt(process.env.WORKFLOW_TOKEN_EXPIRY_MINUTES, 10)
  const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : 15
  const expiredAt = new Date(createdAt.getTime() + minutes * 60 * 1000)
  return {
    expired: Date.now() > expiredAt.getTime(),
    expiredAt,
  }
}
