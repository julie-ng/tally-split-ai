import { eq } from 'drizzle-orm'
import { getTaskActions } from '../../../shared/config/task-permissions.js'

export async function requireWorkflowAuth (event) {
  const db = useDB()

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const runUuid = getHeader(event, 'x-workflow-run-uuid')
  const taskId = getHeader(event, 'x-task-id')

  if (!token || !runUuid || !taskId) return false

  const workflowRun = await db.query.workflowRuns.findFirst({
    where: eq(schema.workflowRuns.uuid, runUuid),
    with: { upload: true, receipt: true },
  })

  if (!workflowRun) {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'run_not_found' }, 'Workflow auth rejected')
    return false
  }

  const { expired, expiredAt } = workflowTokenUtils.isTokenExpired(workflowRun.createdAt)
  if (expired) {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'token_expired', expiredAt: expiredAt.toISOString() }, 'Workflow auth rejected')
    return false
  }

  let actions
  try {
    actions = getTaskActions(taskId)
  }
  catch {
    logSecurityEvent(event, 'warn', { runUuid, taskId, reason: 'unknown_task_id' }, 'Workflow auth rejected')
    return false
  }

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

  const isValid = workflowTokenUtils.verifyCallbackToken(token, {
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
