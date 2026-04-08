import { tasks } from '@trigger.dev/sdk/v3'
import { eq, and, inArray } from 'drizzle-orm'
import { workflowRunInsertSchema } from '~~/shared/utils/zod-schemas/workflow-run.schema.js'
import { WORKFLOW_STATUS } from '~~/shared/enums/workflow-status.js'
import { UPLOAD_ANALYSIS_STATUS } from '~~/shared/enums/upload-analysis-status.js'

export default defineEventHandler(async (event) => {
  const db = useDB()
  requireUserId(event)
  requireHashIdParam(event, 'uploadHashId')

  const hashId = getRouterParam(event, 'uploadHashId')
  const userId = event.context.userId

  // Validate upload exists and is ready
  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.hashId, hashId),
  })

  if (!upload) {
    throw createError({ statusCode: 404, message: 'Upload not found' })
  }

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
    console.log(`⚠️ [workflow] Workflow already active for upload (${hashId}), workflowRunId: ${existingRun.id}`)
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

  // Trigger the workflow (fire and forget)
  console.log(`🚀 [workflow] Triggering receipt-workflow for upload (${hashId}), workflowRunId: ${workflowRun.id}`)
  const handle = await tasks.trigger('receipt-workflow', {
    uploadHashId: hashId,
    userId,
    workflowRunId: workflowRun.id,
  })
  console.log(`✅ [workflow] Triggered receipt-workflow for upload (${hashId}), triggerRunId: ${handle.id}`)

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
