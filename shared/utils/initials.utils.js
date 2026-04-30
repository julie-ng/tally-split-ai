/**
 * Derive initials from a display name. Takes the first character of the
 * first two whitespace-separated tokens, uppercased. For single-token
 * names (e.g. a GitHub login), takes the first two characters.
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
    return (tokens[0][0] + tokens[1][0]).toUpperCase()
  }

  // Single token — take first 2 chars (or 1 if name is one char)
  return tokens[0].slice(0, 2).toUpperCase()
}
