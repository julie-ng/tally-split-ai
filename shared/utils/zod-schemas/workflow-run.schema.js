import { z } from 'zod'
import { WORKFLOW_STATUSES, WORKFLOW_STEP_STATUSES } from '../../enums/workflow-status.js'

/**
 * Workflow Run Object - full workflow run record
 */
export const workflowRunSchema = z.object({
  id: z.number(),
  uploadId: z.number().nullable(),
  receiptId: z.number().nullable(),
  triggerRunId: z.string().nullable(),
  status: z.enum(WORKFLOW_STATUSES),
  ocrStatus: z.enum(WORKFLOW_STEP_STATUSES),
  annotationsStatus: z.enum(WORKFLOW_STEP_STATUSES),
  splitStatus: z.enum(WORKFLOW_STEP_STATUSES),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
})

/**
 * Workflow Run Insert Schema - validates the full object before DB insert
 */
export const workflowRunInsertSchema = z.object({
  uploadId: z.number().optional(),
  receiptId: z.number().optional(),
  status: z.enum(WORKFLOW_STATUSES).default('queued'),
  ocrStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
  annotationsStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
  splitStatus: z.enum(WORKFLOW_STEP_STATUSES).default('pending'),
}).refine(
  data => data.uploadId != null || data.receiptId != null,
  { message: 'At least one of uploadId or receiptId is required' },
)
