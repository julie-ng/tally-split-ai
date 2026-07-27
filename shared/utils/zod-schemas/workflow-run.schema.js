import { z } from 'zod'
import { WORKFLOW_RUN_STATUSES } from '#shared/enums/workflow-run-status.js'
import { WORKFLOW_STEP_STATUSES } from '#shared/enums/workflow-step-status.js'
import { WORKFLOW_STEP_KEYS } from '#shared/enums/workflow-step.js'

/**
 * `{ ocrStatus: <schema>, annotationsStatus: <schema>, … }` for every step in
 * the registry. Built here rather than hand-listed so a new pipeline step needs
 * no edit in this file.
 *
 * @param {import('zod').ZodTypeAny} schema - applied to each step field
 */
function stepStatusFields (schema) {
  return Object.fromEntries(
    WORKFLOW_STEP_KEYS.map(key => [`${key}Status`, schema]),
  )
}

/**
 * Workflow Run Object - full workflow run record
 */
export const workflowRunSchema = z.object({
  id: z.number(),
  uploadId: z.string().nullable(),
  householdId: z.string().nullable(),
  triggerRunId: z.string().nullable(),
  status: z.enum(WORKFLOW_RUN_STATUSES),
  ...stepStatusFields(z.enum(WORKFLOW_STEP_STATUSES)),
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
  ...stepStatusFields(z.enum(WORKFLOW_STEP_STATUSES).default('pending')),
})
