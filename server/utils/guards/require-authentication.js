import { requireWorkflowAuth } from './require-workflow-auth.js'

/**
 * Authenticate the request — establishes who is calling.
 * Dispatches to user session auth or workflow HMAC auth.
 *
 * After this call:
 * - event.context.securityPrincipal is always set — 'user:<userId>' or 'task:<taskId>'
 * - For user auth: event.context.userId is set
 * - For task auth: event.context.workflowRun + event.context.taskId are set
 *
 * User and task auth are mutually exclusive — a request is never both.
 *
 * @param {H3Event} event
 */
export async function requireAuthentication (event) {
  // If workflow auth headers are present, use task path exclusively.
  // Do NOT fall through to user auth if headers are present but invalid —
  // that would be identity blending (a task pretending to be a user on failure).
  const hasWorkflowHeaders = getHeader(event, 'authorization')?.startsWith('Bearer ')
    && getHeader(event, 'x-workflow-run-uuid')

  if (hasWorkflowHeaders) {
    const workflowAuthed = await requireWorkflowAuth(event)
    if (workflowAuthed) return

    logSecurityEvent(event, 'warn', { reason: 'workflow_auth_failed' }, 'Authentication failed')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // User auth path (session-based)
  // TODO: Replace with nuxt-auth-utils module for proper session auth.
  // Currently hardcoded to demo user in development mode.
  const config = useRuntimeConfig()
  const userId = config.public.environment === 'development'
    ? config.public.demoUserId
    : null // TODO: nuxt-auth-utils session lookup goes here

  if (userId) {
    event.context.userId = userId
    event.context.securityPrincipal = `user:${userId}`
    return
  }

  // Neither auth path succeeded
  logSecurityEvent(event, 'warn', { reason: 'no_credentials' }, 'Authentication failed')

  throw createError({
    statusCode: 401,
    message: 'Unauthorized',
  })
}
