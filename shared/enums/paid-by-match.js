/**
 * Paid-by match — tracks whether the LLM successfully matched a paidBy
 * annotation (initials) to a household member. Frozen at LLM run time;
 * never updated by humans. See docs/SCHEMA.md for full semantics.
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

export const PAID_BY_MATCHES = /** @type {['unresolved', 'missing', 'mismatched', 'matched']} */ (Object.values(PAID_BY_MATCH))
