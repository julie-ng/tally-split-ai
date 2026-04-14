import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { WORKFLOW_STATUSES, WORKFLOW_STEP_STATUSES } from '#shared/enums/workflow-status.js'
import { UPLOAD_ANALYSIS_STATUSES } from '#shared/enums/upload-analysis-status.js'

const statusUpdateSchema = z.object({
  // Orchestrator-level status
  status: z.enum(WORKFLOW_STATUSES).optional(),

  // Per-step statuses
  ocrStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  annotationsStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  createSplitStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  adjustSplitStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),
  normalizeStatus: z.enum(WORKFLOW_STEP_STATUSES).optional(),

  // Upload analysis status (orchestrator sets this on completion)
  analysisStatus: z.enum(UPLOAD_ANALYSIS_STATUSES).optional(),

  // Optional fields
  error: z.string().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const log = useLogger('workflow')
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)

  const runUuid = getRouterParam(event, 'runUuid')
  if (!runUuid) {
    throw createError({ statusCode: 400, message: 'Missing runUuid parameter' })
  }

  // Verify the authenticated task owns this workflow run
  if (event.context.workflowRun?.uuid !== runUuid) {
    logSecurityEvent(event, 'warn', { runUuid, reason: 'run_uuid_mismatch' }, 'Workflow status update rejected')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const result = await readValidatedBody(event, body => statusUpdateSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { analysisStatus, ...workflowUpdates } = result.data

  const workflowRun = event.context.workflowRun

  // Build workflow run updates (only include fields that were provided)
  const runUpdates = {}
  if (workflowUpdates.status !== undefined) runUpdates.status = workflowUpdates.status
  if (workflowUpdates.ocrStatus !== undefined) runUpdates.ocrStatus = workflowUpdates.ocrStatus
  if (workflowUpdates.annotationsStatus !== undefined) runUpdates.annotationsStatus = workflowUpdates.annotationsStatus
  if (workflowUpdates.createSplitStatus !== undefined) runUpdates.createSplitStatus = workflowUpdates.createSplitStatus
  if (workflowUpdates.adjustSplitStatus !== undefined) runUpdates.adjustSplitStatus = workflowUpdates.adjustSplitStatus
  if (workflowUpdates.normalizeStatus !== undefined) runUpdates.normalizeStatus = workflowUpdates.normalizeStatus
  if (workflowUpdates.error !== undefined) runUpdates.error = workflowUpdates.error
  if (workflowUpdates.completedAt !== undefined) runUpdates.completedAt = workflowUpdates.completedAt ? new Date(workflowUpdates.completedAt) : null

  // Update workflow run if there are fields to update
  if (Object.keys(runUpdates).length > 0) {
    await db
      .update(schema.workflowRuns)
      .set(runUpdates)
      .where(eq(schema.workflowRuns.id, workflowRun.id))

    log.info({ runUuid, ...runUpdates }, 'Workflow run status updated')
  }

  // Update upload analysis status if provided
  if (analysisStatus) {
    const uploadUpdates = { analysisStatus }
    if (analysisStatus === 'completed') {
      uploadUpdates.analyzedAt = new Date()
    }
    await db
      .update(schema.uploads)
      .set(uploadUpdates)
      .where(eq(schema.uploads.id, workflowRun.uploadId))

    log.info({ runUuid, uploadId: workflowRun.uploadId, analysisStatus }, 'Upload analysis status updated')
  }

  return { success: true }
})
