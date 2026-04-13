import { z } from 'zod'
import { WORKFLOW_STEPS } from '~~/shared/enums/workflow-step.js'
import { WORKFLOW_STEP_STATUSES } from '~~/shared/enums/workflow-status.js'

const callbackSchema = z.object({
  step: z.enum(WORKFLOW_STEPS),
  status: z.enum(WORKFLOW_STEP_STATUSES),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  await requireAuthentication(event)
  requireTaskPermission(event)

  const runUuid = getRouterParam(event, 'runUuid')

  if (!runUuid) {
    throw createError({ statusCode: 400, message: 'Missing runUuid parameter' })
  }

  // Validate request body
  const result = await readValidatedBody(event, body => callbackSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { step, status } = result.data
  const workflowRun = event.context.workflowRun

  log.info({ runUuid, hashId: workflowRun.upload.hashId, step, status }, 'Callback received')

  // Emit to event bus keyed by userId
  workflowBus.emit(workflowRun.upload.userId, {
    uploadHashId: workflowRun.upload.hashId,
    step,
    status,
  })

  return { success: true }
})
