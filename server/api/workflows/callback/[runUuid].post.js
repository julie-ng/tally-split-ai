import { z } from 'zod'
import { WORKFLOW_STEP, WORKFLOW_STEPS } from '#shared/enums/workflow-step.js'
import { WORKFLOW_STATUSES, WORKFLOW_STEP_STATUSES } from '#shared/enums/workflow-status.js'

// The orchestrator step (`_orchestrator`) emits run-level statuses
// (`partial`, `completed`, `processing`, `queued`, `failed`); per-step
// callbacks emit step-level statuses (`pending`, `processing`,
// `completed`, `failed`, `skipped`). Validate against the appropriate enum so a
// `partial` orchestrator notify isn't rejected as an invalid step status.
const callbackSchema = z.object({
  step: z.enum(WORKFLOW_STEPS),
  status: z.string(),
  error: z.string().optional(),
}).refine(
  data => data.step === WORKFLOW_STEP.ORCHESTRATOR
    ? WORKFLOW_STATUSES.includes(data.status)
    : WORKFLOW_STEP_STATUSES.includes(data.status),
  { message: 'Invalid status for step', path: ['status'] },
)

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)

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

  const { step, status, error } = result.data
  const workflowRun = event.context.workflowRun

  log.info({ runUuid, uploadId: workflowRun.upload.id, step, status, error }, 'Callback received')

  // Emit to event bus keyed by userId
  workflowBus.emit(workflowRun.upload.userId, {
    uploadId: workflowRun.upload.id,
    step,
    status,
    ...(error ? { error } : {}),
  })

  return { success: true }
})
