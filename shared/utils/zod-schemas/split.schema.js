import { z } from 'zod'

/**
 * Split Object - tracks expense splitting between two people
 */
export const splitSchema = z.object({
  id: z.number(),
  receiptId: z.number().nullable(),
  splitAmount: z.number(),
  paidBy: z.enum(['user1', 'user2']).nullable(), // null until settled
  owedAmount: z.number().nullable(), // calculated when paidBy is set
  isSettled: z.boolean(),
  settledAt: z.string().nullable(),
  notes: z.string().nullable(),
  userId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/**
 * Split Input Schema - for creating/updating splits via API
 */
export const splitInputSchema = z.object({
  receiptId: z.number().nullable().optional(),
  splitAmount: z.number(),
  paidBy: z.enum(['user1', 'user2']).nullable().optional(), // optional - set when settling
  notes: z.string().nullable().optional(),
  isSettled: z.boolean().optional(),
})

/**
 * Split Update Schema - for partial updates
 */
export const splitUpdateSchema = z.object({
  splitAmount: z.number().optional(),
  paidBy: z.enum(['user1', 'user2']).nullable().optional(),
  notes: z.string().nullable().optional(),
  isSettled: z.boolean().optional(),
})
