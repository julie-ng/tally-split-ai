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
  updatedAt: z.iso.datetime(),
})

/**
 * Receipt Input Schema - for creating/updating receipts via API
 * All fields optional since receipts can be created empty and populated later
 */
export const receiptInputSchema = z.object({
  title: z.string().optional(), // this is the problem…
  merchantName: z.string().nullable().optional(),
  merchantAddress: z.string().nullable().optional(),
  merchantPhone: z.string().nullable().optional(),
  receiptDate: z.iso.date().optional(),
  receiptTags: z.string().nullable().optional(),
  receiptSubtotal: z.number().nullable().optional(),
  receiptTax: z.number().nullable().optional(),
  receiptTotal: z.number().nullable().optional(),
  receiptCurrency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isAnalyzed: z.boolean().optional(),
})
