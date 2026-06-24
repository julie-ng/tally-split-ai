/**
 * Check that the calling task has permission for this endpoint.
 * Skips for authenticated user requests (no taskActions in context).
 * Throws 401 if neither user nor task context is present.
 *
 * Must be called after requireAuthentication() which sets event.context.taskActions.
 *
 * @param {H3Event} event
 */
export function requireTaskPermission (event) {
  const taskActions = event.context.taskActions

  if (!taskActions && event.context.userId) return

  if (!taskActions) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Paranoid: if taskActions exist, taskId and workflowRun must also be set
  if (!event.context.taskId || !event.context.workflowRun) {
    logSecurityEvent(event, 'error', {
      hasTaskActions: true,
      hasTaskId: !!event.context.taskId,
      hasWorkflowRun: !!event.context.workflowRun,
      reason: 'incomplete_task_context',
    }, 'Task permission denied — context inconsistency')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const resource = _deriveResource(getRequestURL(event).pathname)
  const permission = _derivePermission(event.method)

  if (!resource || !permission) {
    logSecurityEvent(event, 'warn', {
      taskId: event.context.taskId,
      path: getRequestURL(event).pathname,
      method: event.method,
      reason: 'unknown_resource_or_permission',
    }, 'Task permission denied')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const required = `${resource}:${permission}`

  if (!taskActions.includes(required)) {
    logSecurityEvent(event, 'warn', {
      taskId: event.context.taskId,
      required,
      granted: taskActions,
      reason: 'insufficient_permissions',
    }, 'Task permission denied')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}

/**
 * Derive the resource type from a request path.
 * @param {string} path - URL pathname (e.g. '/api/receipts/123')
 * @returns {string|null} Resource name or null if unrecognized
 */
export function _deriveResource (path) {
  if (path.startsWith('/api/receipts')) return 'receipt'
  if (path.startsWith('/api/uploads')) return 'upload'
  if (path.startsWith('/api/expenses')) return 'expense'
  if (path.startsWith('/api/workflows')) return 'workflow'
  return null
}

/**
 * Derive the permission type from an HTTP method.
 * @param {string} method - HTTP method (e.g. 'GET', 'POST')
 * @returns {string|null} Permission name or null if unrecognized
 */
export function _derivePermission (method) {
  const map = { GET: 'read', POST: 'write', PUT: 'write', DELETE: 'delete' }
  return map[method] || null
}
