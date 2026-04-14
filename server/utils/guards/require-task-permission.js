export function requireTaskPermission (event) {
  const taskActions = event.context.taskActions

  if (!taskActions && event.context.userId) return

  if (!taskActions) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

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

export function _deriveResource (path) {
  if (path.startsWith('/api/receipts')) return 'receipt'
  if (path.startsWith('/api/uploads')) return 'upload'
  if (path.startsWith('/api/splits')) return 'split'
  if (path.startsWith('/api/workflows')) return 'workflow'
  return null
}

export function _derivePermission (method) {
  const map = { GET: 'read', POST: 'write', PUT: 'write', DELETE: 'delete' }
  return map[method] || null
}
