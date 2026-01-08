import { z } from 'zod'
import { currencySchema } from './currency.schema.js'

/**
 * Azure Item Schema
 */
export const itemSchema = z.object({
  type: z.literal('object'),
  valueObject: z.object({
    Description: z.object({
      type: z.literal('string'),
      valueString: z.string(),
      content: z.string(),
      confidence: z.number()
    }),
    TotalPrice: z.object({
      type: z.literal('currency'),
      valueCurrency: currencySchema,
      content: z.string(),
      confidence: z.number()
    })
  }),
  content: z.string(),
  confidence: z.number()
})
