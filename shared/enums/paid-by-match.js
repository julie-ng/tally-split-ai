/**
 * Paid-by match — tracks whether the LLM successfully matched a paidBy
 * annotation (initials) to a household member.
 *
 * ⚠️ This is a CLASSIFICATION, not a lifecycle status (see README.md). It's the
 * frozen OUTCOME of one LLM matching attempt — stamped once at run time, never
 * updated by humans, and it never transitions (an expense doesn't move from
 * MISMATCHED to MATCHED). Don't read these as "states to progress through".
 *
 * MATCHED does NOT mean the LLM was CORRECT — only that it extracted something
 * mappable to a member. Whether that mapping was right is answered by human edit
 * history in the `changes` table, not by this column. So MATCHED alone is not
 * evidence that no review is needed.
 *
 * - UNRESOLVED  LLM hasn't run yet (default)
 * - MISSING     LLM ran, no paidBy annotation found
 * - MISMATCHED  LLM ran, found initials, but no household member matched
 * - MATCHED     LLM ran, found initials, mapped to a member
 */
export const PAID_BY_MATCH = {
  UNRESOLVED: 'unresolved',
  MISSING: 'missing',
  MISMATCHED: 'mismatched',
  MATCHED: 'matched',
}

/*
 * Generate array variants for Drizzle enums and Zod `enum()` consumers
 */
export const PAID_BY_MATCHES = /** @type {['unresolved', 'missing', 'mismatched', 'matched']} */ (Object.values(PAID_BY_MATCH))
