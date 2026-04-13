import { tasks } from '@trigger.dev/sdk/v3'
import { eq, and, inArray } from 'drizzle-orm'
import { workflowRunInsertSchema } from '~~/shared/utils/zod-schemas/workflow-run.schema.js'
import { WORKFLOW_STATUS } from '~~/shared/enums/workflow-status.js'
import { UPLOAD_ANALYSIS_STATUS } from '~~/shared/enums/upload-analysis-status.js'
import { getTaskActions } from '~~/shared/config/task-permissions.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  const db = useDB()
  await requireAuthentication(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')
  await requireUploadByHashId(event)
  const upload = event.context.upload

  if (upload.status !== 'uploaded') {
    throw createError({
      statusCode: 400,
      message: `Upload must be completed before analysis. Current status: ${upload.status}`,
    })
  }

  // Guard against duplicate triggers
  const existingRun = await db.query.workflowRuns.findFirst({
    where: and(
      eq(schema.workflowRuns.uploadId, upload.id),
      inArray(schema.workflowRuns.status, [WORKFLOW_STATUS.QUEUED, WORKFLOW_STATUS.PROCESSING]),
    ),
  })

  if (existingRun) {
    log.warn({ hashId, workflowRunId: existingRun.id }, 'Workflow already active')
    return {
      success: true,
      message: 'Workflow already in progress',
      workflowRunId: existingRun.id,
      triggerRunId: existingRun.triggerRunId,
    }
  }

  // Validate and insert workflow run record
  const insertData = workflowRunInsertSchema.parse({
    uploadId: upload.id,
  })

  const [workflowRun] = await db
    .insert(schema.workflowRuns)
    .values(insertData)
    .returning()

  // Update upload status
  await db
    .update(schema.uploads)
    .set({ analysisStatus: UPLOAD_ANALYSIS_STATUS.QUEUED })
    .where(eq(schema.uploads.hashId, hashId))

  // Generate action-scoped HMAC token for the orchestrator
  const callbackToken = generateCallbackToken({
    runUuid: workflowRun.uuid,
    runCreatedAt: workflowRun.createdAt.toISOString(),
    scope: `upload:${upload.hashId}`,
    actions: getTaskActions('receipt-workflow'),
  })

  // Trigger the workflow (fire and forget)
  log.info({ hashId, workflowRunId: workflowRun.id }, 'Triggering receipt-workflow')
  const handle = await tasks.trigger('receipt-workflow', {
    uploadHashId: hashId,
    workflowRunId: workflowRun.id,
    runUuid: workflowRun.uuid,
    callbackToken,
  })
  log.info({ hashId, triggerRunId: handle.id }, 'Workflow triggered')

  // Store the Trigger.dev run ID
  await db
    .update(schema.workflowRuns)
    .set({ triggerRunId: handle.id })
    .where(eq(schema.workflowRuns.id, workflowRun.id))

  return {
    success: true,
    runId: handle.id,
    workflowRunId: workflowRun.id,
  }
})
