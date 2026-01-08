import { z } from 'zod'

/**
 * (Azure) Currency
 */
export const currencySchema = z.object({
  amount: z.number(),
  currencyCode: z.string()
})
