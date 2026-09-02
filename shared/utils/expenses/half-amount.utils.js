/**
 * Calculate one person's half of a split amount, rounded DOWN to the cent.
 *
 * Both people get this same floored half, so for odd amounts the split
 * intentionally loses at most one cent (e.g. 41.95 → 20.97 each = 41.94).
 * For a 2-person household that rounding is acceptable and consistent.
 *
 * IMPORTANT: round to integer cents BEFORE halving. Halving first
 * (`splitAmount / 2 * 100`) can produce a value like 114.99999999999999
 * instead of 115 due to float imprecision, silently dropping an extra cent.
 *
 * Pure function — no DB, no I/O.
 *
 * @param {number} splitAmount - Total amount in major units (EUR)
 * @returns {number} - One person's floored half
 */
export function calculateHalfAmount (splitAmount) {
  return Math.floor(Math.round(splitAmount * 100) / 2) / 100
}
