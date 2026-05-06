import { tasks } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

/**
 * Manual single-task trigger for annotations (dev/admin use).
 *
 * Why this exists: Trigger.dev workers don't have direct Azure Storage
 * credentials (SAS URLs are requested via /api/tokens/read instead).
 * Combined with HMAC-scoped task tokens, individual tasks cannot be
 * re-triggered from the Trigger.dev dashboard. This endpoint creates a
 * workflow_runs row and kicks off just the annotations step.
 *
 * Guarded by requireLocalDev — not exposed in production.
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('analysis')
  const db = useDB()
  guards.requireLocalDev(event)
  await guards.requireAuthentication(event)
  guards.requireIdParam(event, 'uploadId')

  const uploadId = getRouterParam(event, 'uploadId')
  await guards.requireAuthorization(event, { uploadId })

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.id, uploadId),
    columns: { id: true },
  })

  if (!upload) {
    throw createError({ statusCode: 404, message: 'Upload not found' })
  }

  const [workflowRun] = await db
    .insert(schema.workflowRuns)
    .values({
      uploadId: upload.id,
      status: WORKFLOW_STATUS.PROCESSING,
      ocrStatus: WORKFLOW_STEP_STATUS.PENDING,
      annotationsStatus: WORKFLOW_STEP_STATUS.PENDING,
      createSplitStatus: WORKFLOW_STEP_STATUS.PENDING,
    })
    .returning()

  const handle = await tasks.trigger('analyze-annotations', {
    uploadId,
    workflowRunId: workflowRun.id,
  })
  log.info({ uploadId, task: 'analyze-annotations', triggerRunId: handle.id }, 'Task triggered')

  return {
    success: true,
    runId: handle.id,
  }
})
