import { tasks } from '@trigger.dev/sdk/v3'
import { eq, and, inArray } from 'drizzle-orm'
import { workflowRunInsertSchema } from '#shared/utils/zod-schemas/workflow-run.schema.js'
import { WORKFLOW_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '#shared/enums/upload-analysis-status.js'
import { getTaskActions } from '#shared/config/task-permissions.js'

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireIdParam(event, 'uploadId')

  const uploadId = getRouterParam(event, 'uploadId')
  await guards.requireAuthorization(event, { uploadId })

  const upload = await db.query.uploads.findFirst({
    where: eq(schema.uploads.id, uploadId),
    columns: { id: true, status: true },
  })

  // Snapshot the household's custom LLM instructions + LLM consent for this run.
  // Edits during the run won't affect in-flight tasks.
  const household = await db.query.households.findFirst({
    where: eq(schema.households.id, event.context.householdId),
    columns: { customInstructions: true, llmConsent: true },
  })
  const customInstructions = household?.customInstructions ?? null
  const llmConsent = household?.llmConsent ?? false

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
    log.warn({ uploadId, workflowRunId: existingRun.id }, 'Workflow already active')
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
    .where(eq(schema.uploads.id, uploadId))

  // Generate action-scoped HMAC token for the orchestrator
  const callbackToken = workflowTokenUtils.generateCallbackToken({
    runUuid: workflowRun.uuid,
    runCreatedAt: workflowRun.createdAt.toISOString(),
    scope: `upload:${upload.id}`,
    actions: getTaskActions('receipt-workflow'),
  })

  // TTL = the callback-token lifetime. If no worker dequeues the run before
  // its token expires, the run could never call back anyway — so let Trigger
  // auto-expire it (status EXPIRED) rather than leave it queued forever. This
  // is the "no worker available" signal; see the reconcile path on load.
  const ttlMinutes = parseInt(process.env.WORKFLOW_TOKEN_EXPIRY_MINUTES, 10) || 15

  // Trigger the workflow (fire and forget). The trigger call is an enqueue to
  // the Trigger.dev cloud; it succeeds even if no worker is running. If the
  // enqueue itself throws, finalize the run as FAILED so we never leave an
  // orphaned 'queued' row the UI can't act on.
  log.info({ uploadId, workflowRunId: workflowRun.id }, 'Triggering receipt-workflow')
  let handle
  try {
    handle = await tasks.trigger('receipt-workflow', {
      uploadId,
      workflowRunId: workflowRun.id,
      runUuid: workflowRun.uuid,
      callbackToken,
      customInstructions,
      llmConsent,
    }, {
      ttl: `${ttlMinutes}m`,
    })
  }
  catch (err) {
    log.error({ uploadId, workflowRunId: workflowRun.id, error: err.message }, 'Failed to enqueue receipt-workflow')

    // The run row failed (it genuinely failed to start — this is what the
    // retry button keys off). But the UPLOAD's analysis never started, so
    // revert it to PENDING rather than FAILED: analysis can't have "failed"
    // if it never began, and PENDING leaves the upload cleanly re-triggerable.
    await db
      .update(schema.workflowRuns)
      .set({
        status: WORKFLOW_STATUS.FAILED,
        completedAt: new Date(),
        errors: { [WORKFLOW_STEP.ORCHESTRATOR]: `Failed to enqueue workflow: ${err.message}` },
      })
      .where(eq(schema.workflowRuns.id, workflowRun.id))

    await db
      .update(schema.uploads)
      .set({ analysisStatus: UPLOAD_ANALYSIS_STATUS.PENDING })
      .where(eq(schema.uploads.id, uploadId))

    throw createError({ statusCode: 502, message: 'Failed to start analysis workflow' })
  }
  log.info({ uploadId, triggerRunId: handle.id }, 'Workflow triggered')

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
