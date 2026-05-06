import { z } from 'zod'
import { emptyToNull } from './helpers.js'

/**
 * Schema for household update request body.
 * Used in PUT /api/households/[id]
 *
 * Both fields are optional (partial update). Empty strings coerce to null
 * so users can clear description.
 */
export const householdUpdateSchema = z.object({
  name: z.preprocess(emptyToNull, z.string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional()),
  description: z.preprocess(emptyToNull, z.string()
    .trim()
    .max(500)
    .nullable()
    .optional()),
  customInstructions: z.preprocess(emptyToNull, z.string()
    .trim()
    .max(2000)
    .nullable()
    .optional()),
}).refine(
  data => Object.keys(data).length > 0,
  { error: 'At least one field must be provided for update' },
)
