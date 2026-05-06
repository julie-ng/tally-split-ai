import { z } from 'zod'

/**
 * Schema for upload update request body
 * Used in PUT /api/uploads/[id]
 *
 * All fields are optional since this is a partial update.
 * At least one field must be provided.
 */
export const uploadUpdateSchema = z.object({
  contentType: z.string().optional(),
  title: z.string().optional(),
  size: z.number().nonnegative('size must be a non-negative number').optional(),
  azureTags: z.record(z.string(), z.string()).optional(),
  status: z.string().optional(),
  uploadedAt: z.string().datetime().optional(),

  // Task-written fields (set by Trigger.dev tasks via API)
  ocrText: z.string().nullable().optional(),
  ocrJson: z.any().optional(), // full Azure Document Intelligence response
  annotationsJson: z.any().optional(), // GPT-4o annotation results
  receiptId: z.string().optional(),
}).refine(
  data => Object.keys(data).length > 0,
  { error: 'At least one field must be provided for update' },
)
