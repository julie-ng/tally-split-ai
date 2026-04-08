import { tasks } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '~~/shared/enums/workflow-status.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  requireUserId(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')

  // TODO: Extract upload existence check into a guard (e.g., requireUploadByHashId)
  // to avoid duplicating this across endpoints and trigger tasks
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
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
      splitStatus: WORKFLOW_STEP_STATUS.PENDING,
    })
    .returning()

  console.log(`🚀 [analysis/ocr] Triggering analyze-ocr for upload (${hashId}), workflowRunId: ${workflowRun.id}`)
  const handle = await tasks.trigger('analyze-ocr', {
    uploadHashId: hashId,
    workflowRunId: workflowRun.id,
  })
  console.log(`✅ [analysis/ocr] Triggered analyze-ocr for upload (${hashId}), triggerRunId: ${handle.id}`)

  return {
    success: true,
    runId: handle.id,
  }
})
