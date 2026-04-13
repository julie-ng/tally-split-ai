import { tasks } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '~~/shared/enums/workflow-status.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('analysis')
  const db = useDB()
  requireLocalDev(event)
  await requireAuthentication(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')
  await requireUploadByHashId(event)
  const upload = event.context.upload

  const [workflowRun] = await db
    .insert(schema.workflowRuns)
    .values({
      uploadId: upload.id,
      status: WORKFLOW_STATUS.PROCESSING,
      ocrStatus: WORKFLOW_STEP_STATUS.PENDING,
      annotationsStatus: WORKFLOW_STEP_STATUS.PENDING,
      splitStatus: WORKFLOW_STEP_STATUS.PENDING,
    })
    .returning()

  const handle = await tasks.trigger('analyze-annotations', {
    uploadHashId: hashId,
    workflowRunId: workflowRun.id,
  })
  log.info({ hashId, task: 'analyze-annotations', triggerRunId: handle.id }, 'Task triggered')

  return {
    success: true,
    runId: handle.id,
  }
})
