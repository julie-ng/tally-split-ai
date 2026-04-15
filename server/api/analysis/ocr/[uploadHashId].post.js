import { tasks } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('analysis')
  const db = useDB()
  guards.requireLocalDev(event)
  await guards.requireAuthentication(event)
  guards.requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')
  await guards.requireAuthorization(event, { uploadHashId: hashId })

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
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

  const handle = await tasks.trigger('analyze-ocr', {
    uploadHashId: hashId,
    workflowRunId: workflowRun.id,
  })
  log.info({ hashId, task: 'analyze-ocr', triggerRunId: handle.id }, 'Task triggered')

  return {
    success: true,
    runId: handle.id,
  }
})
