import { calculateHalfAmount } from './half-amount.utils.js'

/**
 * Resolve the two per-person shares from an LLM's slot allocation, with a
 * 50/50 fallback. Pure function — no DB, no I/O.
 *
 * The adjust-expense LLM returns `shares` keyed by slot ({ user1, user2 }) that
 * should sum to `adjustedTotal`. We trust it only when both values are finite,
 * non-negative numbers that sum to the total within a 1-cent tolerance
 * (rounding) — otherwise we fall back to an even split, so we never persist
 * shares that don't reconcile with the amount. Each trusted share is floored to
 * the cent (round-down rule; an odd cent is intentionally dropped, matching
 * calculateHalfAmount).
 *
 * @param {number|null|undefined} adjustedTotal
 * @param {{ user1?: number, user2?: number }|null|undefined} shares
 * @returns {{ userOneShare: number|null, userTwoShare: number|null, usedFallback: boolean }}
 */
export function resolveShares (adjustedTotal, shares) {
  // No amount to allocate — let the caller keep the existing shares.
  if (adjustedTotal == null) {
    return { userOneShare: null, userTwoShare: null, usedFallback: false }
  }

  const s1 = shares?.user1
  const s2 = shares?.user2
  const valid
    = Number.isFinite(s1) && Number.isFinite(s2)
      && s1 >= 0 && s2 >= 0
      && Math.abs((s1 + s2) - adjustedTotal) <= 0.01

  if (valid) {
    return {
      userOneShare: Math.floor(s1 * 100) / 100,
      userTwoShare: Math.floor(s2 * 100) / 100,
      usedFallback: false,
    }
  }

  const half = calculateHalfAmount(adjustedTotal)
  return { userOneShare: half, userTwoShare: half, usedFallback: true }
}
