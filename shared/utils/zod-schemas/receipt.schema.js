import { z } from 'zod'
import { RECEIPT_ANALYSIS_STATUSES } from '../../enums/receipt-analysis-status.js'

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
  time: z.string().nullable(), // ISO time string (e.g., "17:45:00")
  tags: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
  currency: z.string().nullable(),
  notes: z.string().nullable(),
  analysisStatus: z.enum(RECEIPT_ANALYSIS_STATUSES),
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
  date: z.iso.date().nullable().optional(), // nullable: OCR may fail to extract; normalize-receipt task can fix later
  time: z.string().nullable().optional(), // nullable: not all receipts have time; normalize-receipt task extracts when available
  tags: z.string().nullable().optional(),
  subtotal: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  tip: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  analysisStatus: z.enum(RECEIPT_ANALYSIS_STATUSES).optional(),
  splitId: z.number().int().positive().nullable().optional(),
})
