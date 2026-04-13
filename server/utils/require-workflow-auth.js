import { eq } from 'drizzle-orm'
import { getTaskActions } from '~~/shared/config/task-permissions.js'

/**
 * Authenticate a Trigger.dev task via HMAC callback token.
 * Called internally by requireAuthentication — not directly by handlers.
 *
 * Sets event.context.workflowRun (full object with upload/receipt) and event.context.taskId.
 * Does NOT set event.context.userId — tasks are not users.
 *
 * @param {H3Event} event
 * @returns {Promise<boolean>} true if workflow auth succeeded
 */
export async function requireWorkflowAuth (event) {
  const db = useDB()

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const runUuid = getHeader(event, 'x-workflow-run-uuid')
  const taskId = getHeader(event, 'x-task-id')

  if (!token || !runUuid || !taskId) return false

  // Look up workflow run by UUID (join upload and receipt for scope derivation)
  const workflowRun = await db.query.workflowRuns.findFirst({
    where: eq(schema.workflowRuns.uuid, runUuid),
    with: { upload: true, receipt: true },
  })

  if (!workflowRun) {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'run_not_found' }, 'Workflow auth rejected')
    return false
  }

  // Expiry check (uses testable utility)
  const { expired, expiredAt } = isTokenExpired(workflowRun.createdAt)
  if (expired) {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'token_expired', expiredAt: expiredAt.toISOString() }, 'Workflow auth rejected')
    return false
  }

  // Look up task's allowed actions from the permissions map
  let actions
  try {
    actions = getTaskActions(taskId)
  }
  catch {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'unknown_task_id' }, 'Workflow auth rejected')
    return false
  }

  // Derive scope from the workflow run's linked resource
  let scope
  if (workflowRun.upload) {
    scope = `upload:${workflowRun.upload.hashId}`
  }
  else if (workflowRun.receiptId) {
    scope = `receipt:${workflowRun.receiptId}`
  }
  else {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'no_scope_resource' }, 'Workflow auth rejected')
    return false
  }

  // HMAC verification (uses testable utility)
  const isValid = verifyCallbackToken(token, {
    runUuid: workflowRun.uuid,
    runCreatedAt: workflowRun.createdAt.toISOString(),
    scope,
    actions,
  })

  if (!isValid) {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'invalid_hmac' }, 'Workflow auth rejected')
    return false
  }

  event.context.workflowRun = workflowRun
  event.context.taskId = taskId
  event.context.taskActions = actions
  event.context.securityPrincipal = `task:${taskId}`

  return true
}
