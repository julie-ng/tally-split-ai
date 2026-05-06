import { z } from 'zod'

/**
 * Schema for opaque id route parameter (nanoid: 18 chars, lowercase + digits).
 * All public-facing tables (households, users, uploads, receipts, splits)
 * share this format — see shared/utils/generate-id.js.
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{18}$/, 'id must be 18 lowercase alphanumeric characters'),
})
