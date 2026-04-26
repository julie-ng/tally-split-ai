import { z } from 'zod'

/**
 * Schema for read SAS token request body
 * Used in POST /api/tokens/read
 */
export const tokenReadRequestSchema = z.object({
  action: z.string().refine(value => value === 'read', { error: 'Invalid action' }),
  blobName: z.string(),
})
