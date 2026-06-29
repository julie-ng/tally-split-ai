/**
 * Derive initials from a display name. Takes the first character of the
 * FIRST and LAST whitespace-separated tokens, uppercased — so a middle name
 * doesn't change the result (e.g. "John Michael Adams" → "JA", same as
 * "John Adams"). For single-token names (e.g. a GitHub login), takes just the
 * first character.
 *
 * Returns '??' for empty/whitespace-only input.
 *
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function deriveInitials (name) {
  if (!name) return '??'
  const trimmed = name.trim()
  if (!trimmed) return '??'

  const tokens = trimmed.split(/\s+/)
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase()
  }

  // Single token (e.g. a GitHub login) — just the first character.
  return tokens[0][0].toUpperCase()
}
