/**
 * Log a security event with IP address and structured context.
 * Centralizes security logging pattern — always includes client IP.
 *
 * @param {H3Event} event - H3 event (used to extract IP)
 * @param {string} level - Log level ('warn', 'error', 'info')
 * @param {Object} context - Structured context (reason, runUuid, taskId, etc.)
 * @param {string} message - Log message
 */
export function logSecurityEvent (event, level, context, message) {
  const log = useLogger('security')
  const ip = getRequestIP(event, { xForwardedFor: true })
  log[level]({ ip, ...context }, message)
}
