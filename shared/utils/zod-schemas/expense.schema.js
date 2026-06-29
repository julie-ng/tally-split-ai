import { z } from 'zod'
import { PAID_BY_MATCHES } from '#shared/enums/paid-by-match.js'

/**
 * Expense Object - tracks expense splitting between two household members
 */
export const expenseSchema = z.object({
  id: z.string(),
  receiptId: z.string().nullable(),
  title: z.string(),
  date: z.string().nullable(), // UTC ISO instant (timestamptz), null if unset
  splitAmount: z.number(),
  userOneShare: z.number().nullable(),
  userTwoShare: z.number().nullable(),
  userOneId: z.string().nullable(),
  userTwoId: z.string().nullable(),
  paidByUserId: z.string().nullable(),
  paidByMatch: z.enum(PAID_BY_MATCHES),
  isSettled: z.boolean(),
  settledAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/**
 * Expense Request Schema - validates HTTP request body for POST /api/expenses
 */
export const expenseRequestSchema = z.object({
  receiptId: z.string().nullable().optional(),
  title: z.string().optional(),
  date: z.string().nullable().optional(), // UTC ISO instant from the client (built via expense-date.utils)
  splitAmount: z.number(),
  userOneShare: z.number().nullable().optional(),
  userTwoShare: z.number().nullable().optional(),
  userOneId: z.string().nullable().optional(),
  userTwoId: z.string().nullable().optional(),
  paidByUserId: z.string().nullable().optional(), // who paid (human-set on create); null = unsure
  notes: z.string().nullable().optional(),
  isSettled: z.boolean().optional(),
})

/**
 * Expense Update Schema - for partial updates from humans (and from tasks for
 * non-paidBy fields). The paidByUserId / paidByMatch fields are intentionally
 * excluded — paidBy resolution flows through POST /api/expenses/[id]/task.
 */
export const expenseUpdateSchema = z.object({
  title: z.string().optional(),
  date: z.string().nullable().optional(), // UTC ISO instant (timestamptz), null to clear
  splitAmount: z.number().optional(),
  userOneShare: z.number().nullable().optional(),
  userTwoShare: z.number().nullable().optional(),
  paidByUserId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSettled: z.boolean().optional(),

  // Change tracking metadata (not persisted on the expense itself)
  llm: z.object({
    confidence: z.number().min(0).max(1).nullable().optional(),
    reasoning: z.string().nullable().optional(),
    fieldConfidence: z.record(z.string(), z.number().min(0).max(1)).nullable().optional(),
    sourceVersion: z.string().nullable().optional(),
  }).optional(),
})

/**
 * Expense Task Resolution Schema - validates POST /api/expenses/[id]/task body.
 * Sent by the adjust-expense trigger task with raw LLM output. The LLM is given
 * the two members keyed by slot ('user1'/'user2') and returns the payer as a
 * slot (or 'mismatched' when it read initials matching neither member, or null);
 * the endpoint maps slot → userId and sets paidByMatch in one transaction.
 */
export const expenseTaskResolutionSchema = z.object({
  adjustedTotal: z.number().nullable().optional(),
  userOneShare: z.number().nullable().optional(),
  userTwoShare: z.number().nullable().optional(),
  // Payer as a household slot. 'mismatched' = LLM found initials but they map to
  // no member; null = no payer signal.
  paidBySlot: z.enum(['user1', 'user2', 'mismatched']).nullable().optional(),

  // Change tracking metadata
  llm: z.object({
    confidence: z.number().min(0).max(1).nullable().optional(),
    reasoning: z.string().nullable().optional(),
    fieldConfidence: z.record(z.string(), z.number().min(0).max(1)).nullable().optional(),
    sourceVersion: z.string().nullable().optional(),
  }).optional(),
})
