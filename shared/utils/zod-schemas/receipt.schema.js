import { z } from 'zod'

/**
 * Receipt Object - Business/finance data extracted from receipt images
 */
export const receiptSchema = z.object({
  id: z.number(),
  merchantName: z.string().nullable(),
  merchantAddress: z.string().nullable(),
  merchantPhone: z.string().nullable(),
  receiptDate: z.string().nullable(), // ISO date string (e.g., "2024-01-09")
  receiptTags: z.string().nullable(),
  receiptSubtotal: z.number().nullable(),
  receiptTax: z.number().nullable(),
  receiptTotal: z.number().nullable(),
  receiptCurrency: z.string().nullable(),
  notes: z.string().nullable(),
  isAnalyzed: z.boolean(),
  userId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
})
