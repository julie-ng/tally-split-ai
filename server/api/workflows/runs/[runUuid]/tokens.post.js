import { z } from 'zod'
import { getTaskActions, getTaskChildren } from '~~/shared/config/task-permissions.js'

const tokenRequestSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  await requireAuthentication(event)
  requireTaskPermission(event)

  const runUuid = getRouterParam(event, 'runUuid')
  if (!runUuid) {
    throw createError({ statusCode: 400, message: 'Missing runUuid parameter' })
  }

  const result = await readValidatedBody(event, body => tokenRequestSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const workflowRun = event.context.workflowRun
  const callingTaskId = event.context.taskId

  // Verify the calling task is allowed to generate tokens for these children
  let allowedChildren
  try {
    allowedChildren = getTaskChildren(callingTaskId)
  }
  catch {
    logSecurityEvent(event, 'warn', {
      taskId: callingTaskId,
      requestedTaskIds: result.data.taskIds,
      reason: 'not_an_orchestrator',
    }, 'Token generation denied')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  for (const taskId of result.data.taskIds) {
    if (!allowedChildren.includes(taskId)) {
      logSecurityEvent(event, 'warn', {
        taskId: callingTaskId,
        requestedTaskId: taskId,
        allowedChildren,
        reason: 'unauthorized_child_task',
      }, 'Token generation denied')
      throw createError({ statusCode: 403, message: `Not allowed to generate token for task '${taskId}'` })
    }
  }

  // Derive scope from workflow run's linked resource
  let scope
  if (workflowRun.upload) {
    scope = `upload:${workflowRun.upload.hashId}`
  }
  else if (workflowRun.receiptId) {
    scope = `receipt:${workflowRun.receiptId}`
  }
  else {
    throw createError({ statusCode: 500, message: 'Workflow run has no linked resource' })
  }

  // Generate a token per requested task
  const tokens = {}
  for (const taskId of result.data.taskIds) {
    tokens[taskId] = generateCallbackToken({
      runUuid: workflowRun.uuid,
      runCreatedAt: workflowRun.createdAt.toISOString(),
      scope,
      actions: getTaskActions(taskId),
    })
  }

  log.info({ runUuid, taskIds: result.data.taskIds }, 'Generated per-task tokens')

  return { success: true, tokens }
})
