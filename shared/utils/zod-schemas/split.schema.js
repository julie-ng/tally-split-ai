import { z } from 'zod'

/**
 * Split Object - tracks expense splitting between two people
 */
export const splitSchema = z.object({
  id: z.number(),
  receiptId: z.number().nullable(),
  splitAmount: z.number(),
  paidBy: z.string().nullable(), // User ID who paid - null until settled
  userAShare: z.number().nullable(), // Amount userA's share
  userBShare: z.number().nullable(), // Amount userB's share
  isSettled: z.boolean(),
  settledAt: z.string().nullable(),
  notes: z.string().nullable(),
  userId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/**
 * Split Request Schema - validates HTTP request body for POST /api/splits
 */
export const splitRequestSchema = z.object({
  receiptId: z.number().nullable().optional(),
  splitAmount: z.number(),
  paidBy: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSettled: z.boolean().optional(),
})

/**
 * Split Insert Schema - validates the full object before DB insert
 */
export const splitInsertSchema = z.object({
  receiptId: z.number().nullable(),
  splitAmount: z.number(),
  userId: z.string(),
  userAShare: z.number().nullable(),
  userBShare: z.number().nullable(),
  paidBy: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSettled: z.boolean(),
})

/**
 * Split Update Schema - for partial updates
 */
export const splitUpdateSchema = z.object({
  splitAmount: z.number().optional(),
  paidBy: z.string().nullable().optional(),
  userAShare: z.number().nullable().optional(),
  userBShare: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSettled: z.boolean().optional(),

  // Change tracking metadata (not persisted on the split itself)
  llm: z.object({
    confidence: z.number().min(0).max(1).nullable().optional(),
    reasoning: z.string().nullable().optional(),
    fieldConfidence: z.record(z.string(), z.number().min(0).max(1)).nullable().optional(),
  }).optional(),
})
