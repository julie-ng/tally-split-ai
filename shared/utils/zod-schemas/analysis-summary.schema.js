import { z } from 'zod'
import { addressSchema } from './address.schema.js'
import { currencySchema } from './currency.schema.js'

/**
 * Sorted fields done in /api/analysis/summary/[uploadId]
 */
export const analysisSummarySchema = z.object({
  merchant: z.object({
    address: addressSchema,
    name: z.object({
      value: z.string(),
      confidence: z.number(),
    }),
    phone: z.object({
      value: z.string(),
      confidence: z.number(),
    }).optional(),
  }),
  receipt: z.object({
    countryRegion: z.object({
      value: z.string(),
      confidence: z.number(),
    }),
    type: z.object({
      value: z.string(),
      confidence: z.number(),
    }),
    total: z.object({
      value: currencySchema,
      formattedValue: z.string(),
      confidence: z.number(),
    }),
    transactionDate: z.object({
      value: z.string(),
      confidence: z.number(),
    }),
    transactionTime: z.object({
      value: z.string(),
      confidence: z.number(),
    }),
    taxDetails: z.object({
      value: z.array(z.any()),
    }).optional(),
  }),
  items: z.object({
    subtotal: z.number().optional(),
    hasQuantity: z.boolean().optional(),
    items: z.array(z.any()),
  }),
  errors: z.array(z.object({
    message: z.string(),
    error: z.any().optional(),
  })).optional(),
})
