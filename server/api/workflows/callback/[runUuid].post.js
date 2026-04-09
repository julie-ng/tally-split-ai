import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { WORKFLOW_STEPS } from '~~/shared/enums/workflow-step.js'
import { WORKFLOW_STEP_STATUSES } from '~~/shared/enums/workflow-status.js'

const callbackSchema = z.object({
  step: z.enum(WORKFLOW_STEPS),
  status: z.enum(WORKFLOW_STEP_STATUSES),
  callbackToken: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const db = useDB()
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

  const { step, status, callbackToken } = result.data

  // Look up workflow run by UUID, joined with upload
  const workflowRun = await db.query.workflowRuns.findFirst({
    where: eq(schema.workflowRuns.uuid, runUuid),
    with: { upload: true },
  })

  if (!workflowRun) {
    throw createError({ statusCode: 404, message: 'Workflow run not found' })
  }

  // Verify HMAC token
  const isValid = verifyCallbackToken(callbackToken, {
    runUuid: workflowRun.uuid,
    runCreatedAt: workflowRun.createdAt.toISOString(),
    blobUrl: workflowRun.upload.blobUrl,
  })

  if (!isValid) {
    throw createError({ statusCode: 401, message: 'Invalid callback token' })
  }

  // Emit to event bus keyed by userId
  workflowBus.emit(workflowRun.upload.userId, {
    uploadHashId: workflowRun.upload.hashId,
    step,
    status,
  })

  return { success: true }
})
