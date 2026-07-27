import { z } from 'zod'
import { WORKFLOW_RUN_STATUSES } from '#shared/enums/workflow-run-status.js'
import { WORKFLOW_STEP_STATUSES } from '#shared/enums/workflow-step-status.js'

/**
 * Workflow Run Object - full workflow run record
 */
export const workflowRunSchema = z.object({
  id: z.number(),
  uploadId: z.string().nullable(),
  householdId: z.string().nullable(),
  triggerRunId: z.string().nullable(),
  status: z.enum(WORKFLOW_RUN_STATUSES),
  ocrStatus: z.enum(WORKFLOW_STEP_STATUSES),
  annotationsStatus: z.enum(WORKFLOW_STEP_STATUSES),
  createExpenseStatus: z.enum(WORKFLOW_STEP_STATUSES),
  adjustExpenseStatus: z.enum(WORKFLOW_STEP_STATUSES),
  normalizeStatus: z.enum(WORKFLOW_STEP_STATUSES),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
})

/**
 * Workflow Run Insert Schema - validates the full object before DB insert
 */
export const workflowRunInsertSchema = z.object({
  uploadId: z.string(),
  // Denormalized, write-once AuthZ scope — set at run creation, never updated.
  householdId: z.string(),
  status: z.enum(WORKFLOW_RUN_STATUSES).default('queued'),
  ocrStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
  annotationsStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
  createExpenseStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
  adjustExpenseStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
  normalizeStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
})
