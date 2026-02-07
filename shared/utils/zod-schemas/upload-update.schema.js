import { z } from 'zod'

/**
 * Schema for upload update request body
 * Used in PUT /api/uploads/[hashId]
 *
 * All fields are optional since this is a partial update.
 * At least one field must be provided.
 */
export const uploadUpdateSchema = z.object({
  contentType: z.string().optional(),
  title: z.string().optional(),
  size: z.number().nonnegative('size must be a non-negative number').optional(),
  azureTags: z.object().optional(),
  // azureTags: z.object({
  //   'receipt-date': z.string().optional(),
  //   'receipt-id': z.string().optional(),
  //   'user-id': z.string().optional(),
  // }).optional(),
  status: z.string().optional(),
  // uploadedAt: z.union([z.literal(true), z.number()]).optional()
}).refine(
  data => Object.keys(data).length > 0,
  { error: 'At least one field must be provided for update' },
)
