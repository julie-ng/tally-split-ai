import { requireWorkflowAuth } from './require-workflow-auth.js'

/**
 * Authenticate the request — establishes who is calling.
 * Dispatches to user session auth or workflow HMAC auth.
 *
 * After this call:
 * - event.context.securityPrincipal is always set — 'user:<userId>' or 'task:<taskId>'
 * - For user auth: event.context.userId and event.context.householdId are set
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

  // User auth path (session-based via nuxt-auth-utils)
  const session = await getUserSession(event)
  const userId = session?.user?.id
  const householdId = session?.user?.householdId

  if (userId) {
    // Reject sessions issued before householdId was added to the session payload.
    // Forces re-login so the new session shape is picked up.
    if (!householdId) {
      logSecurityEvent(event, 'warn', { userId, reason: 'session_missing_household' }, 'Stale session, household missing')
      await clearUserSession(event)
      throw createError({ statusCode: 401, message: 'Session expired, please log in again' })
    }

    // householdId is a scope claim used by requireAuthorization to filter
    // resources. Stored in the session (not fetched per request) for the same
    // reason OAuth puts scopes in JWTs — it's an authZ claim, not domain data.
    event.context.userId = userId
    event.context.householdId = householdId
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
