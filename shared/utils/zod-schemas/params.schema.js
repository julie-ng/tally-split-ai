import { z } from 'zod'

/**
 * Schema for hashId route parameter
 * Used in /api/uploads/[hashId] and /api/analysis/[uploadHashId] endpoints
 */
export const hashIdParamSchema = z.object({
  hashId: z.string().min(1, 'hashId is required')
})

/**
 * Schema for numeric id route parameter
 * Used in /api/receipts/[id] endpoints
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be a numeric string')
})
