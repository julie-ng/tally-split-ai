import { z } from 'zod'
import { emptyToNull } from './helpers.js'

/**
 * Schema for user update request body
 * Used in PATCH /api/user
 *
 * All fields are optional since this is a partial update.
 * At least one field must be provided.
 * Empty strings are coerced to null so users can clear a field.
 */
export const userUpdateSchema = z.object({
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
