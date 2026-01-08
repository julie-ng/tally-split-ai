import { z } from 'zod'

/**
 * (Azure) Address
 */
export const addressSchema = z.object({
  value: z.object({
    houseNumber: z.string().optional(),
    road: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    streetAddress: z.string().optional()
  }),
  formattedValue: z.string(),
  confidence: z.number()
})
