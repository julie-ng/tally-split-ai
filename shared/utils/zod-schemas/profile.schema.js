import { z } from 'zod'

const emptyToNull = v => (typeof v === 'string' && v.trim() === '' ? null : v)

/**
 * Schema for profile update request body
 * Used in PATCH /api/profile
 *
 * All fields are optional since this is a partial update.
 * At least one field must be provided.
 * Empty strings are coerced to null so users can clear a field.
 */
export const profileUpdateSchema = z.object({
  displayName: z.preprocess(emptyToNull, z.string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional()),
  initials: z.preprocess(emptyToNull, z.string()
    .trim()
    .min(1)
    .max(5)
    .nullable()
    .optional()),
}).refine(
  data => Object.keys(data).length > 0,
  { error: 'At least one field must be provided for update' },
)
