/**
 * Log a security event with request metadata and structured context.
 * Centralizes security logging — always includes IP, user-agent, method, and path.
 *
 * @param {H3Event} event - H3 event (used to extract request metadata)
 * @param {string} level - Log level ('warn', 'error', 'info')
 * @param {Object} context - Structured context (reason, runUuid, taskId, etc.)
 * @param {string} message - Log message
 */
export function logSecurityEvent (event, level, context, message) {
  const log = useLogger('security')
  const ip = getRequestIP(event, { xForwardedFor: true })
  const userAgent = getHeader(event, 'user-agent')
  const method = event.method
  const path = getRequestURL(event).pathname
  log[level]({ ip, userAgent, method, path, ...context }, message)
}
