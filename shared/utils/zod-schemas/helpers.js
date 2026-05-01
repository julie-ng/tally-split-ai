/**
 * Coerce empty/whitespace-only strings to null.
 *
 * Used in Zod `preprocess` so HTML form inputs (which submit '' for cleared
 * fields) can clear nullable columns. Zod has no built-in for this — its
 * `coerce` casts via constructors (String('') === '') and `.nullable()` only
 * accepts a literal null, not an empty string.
 */
export const emptyToNull = v => (typeof v === 'string' && v.trim() === '' ? null : v)
