export function isTokenExpired (createdAt, expiryMinutes) {
  const parsed = expiryMinutes ?? parseInt(process.env.WORKFLOW_TOKEN_EXPIRY_MINUTES, 10)
  const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : 15
  const expiredAt = new Date(createdAt.getTime() + minutes * 60 * 1000)
  return {
    expired: Date.now() > expiredAt.getTime(),
    expiredAt,
  }
}
