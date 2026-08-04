import { z } from 'zod'

/**
 * Zod schemas for the structured outputs of the three LLM calls.
 *
 * These mirror the "Response Format" sections of the prompts in
 * `trigger/instructions/*.md` and the return contracts documented on
 * each caller util. They're passed to the AI SDK's `generateObject`,
 * which enforces the shape at the provider (strict structured output) —
 * replacing the old free-form `response_format: json_object` + manual
 * `JSON.parse`.
 */

// analyze-annotations.js — vision call. One entry per handwritten mark, bound
// to the OCR line item it covers.
//
// IMPORTANT — this schema and `trigger/instructions/analyze-annotations.md` are
// ONE artifact. `generateObject` enforces the schema at the provider, so the
// schema silently wins any disagreement: the model can't return a field that
// isn't here, it just improvises the content into a field that is. Change the
// two together, and keep the `.describe()` text in sync with the prompt — the
// descriptions are the only field-level spec the model sees.
export const annotationsSchema = z.object({
  annotations: z.array(
    z.object({
      lineItemIndex: z.number().int().nullable().describe('0-based index into the provided OCR line items; null for marks not tied to a line item (e.g. margin initials, a mark on the total)'),
      item: z.string().nullable().describe('description of the line item this mark covers, copied verbatim from the OCR line items; null when lineItemIndex is null'),
      type: z.string().nullable().describe('e.g. initials, circle, strikethrough'),
      value: z.string().nullable().describe('the handwritten content, if any'),
      location: z.string().nullable().describe('where the mark appears (e.g. "next to item", "top right corner")'),
    }),
  ),
  notes: z.string().nullable(),
})

// adjust-expense.js — asymmetric split allocation. Slot-keyed (user1/user2);
// no userIds cross this boundary. Mirrors instructions/adjust-expense.md.
export const adjustExpenseSchema = z.object({
  originalTotal: z.number().nullable(),
  adjustedTotal: z.number().nullable(),
  shares: z.object({
    user1: z.number(),
    user2: z.number(),
  }).nullable(),
  paidBy: z.enum(['user1', 'user2', 'mismatched']).nullable(),
  confidence: z.number().min(0).max(1),
  amountConfidence: z.number().min(0).max(1),
  shareConfidence: z.number().min(0).max(1),
  payerConfidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

// normalize-receipt.js — date/year fix, title, filename classification.
// Mirrors instructions/normalize-receipt.md.
export const normalizeReceiptSchema = z.object({
  date: z.string().nullable().describe('ISO date YYYY-MM-DD or null'),
  time: z.string().nullable().describe('ISO time HH:MM:SS or null'),
  title: z.string(),
  filenameIsHumanNamed: z.boolean(),
})
