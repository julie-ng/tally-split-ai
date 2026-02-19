import { z } from 'zod'

/**
 * Receipt Object - Business/finance data extracted from receipt images
 */
export const receiptSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  merchantName: z.string().nullable(),
  merchantAddress: z.string().nullable(),
  merchantPhone: z.string().nullable(),
  date: z.string().nullable(), // ISO date string (e.g., "2024-01-09")
  tags: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
  currency: z.string().nullable(),
  notes: z.string().nullable(),
  analysisStatus: z.string(),
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
  date: z.iso.date().optional(),
  tags: z.string().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  tip: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  analysisStatus: z.string().optional(),
})
