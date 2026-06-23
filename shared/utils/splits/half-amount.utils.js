/**
 * Calculate one person's half of a split amount, rounded DOWN to the cent.
 *
 * Both people get this same floored half, so for odd amounts the split
 * intentionally loses up to one cent (e.g. 41.95 → 20.97 each = 41.94).
 * For a 2-person household that rounding is acceptable and consistent.
 *
 * Pure function — no DB, no I/O.
 *
 * @param {number} splitAmount - Total amount in major units (EUR)
 * @returns {number} - One person's floored half
 */
export function calculateHalfAmount (splitAmount) {
  return Math.floor(splitAmount / 2 * 100) / 100
}
