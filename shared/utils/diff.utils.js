const SKIP_FIELDS = new Set(['updatedAt', 'createdAt', 'id'])

/**
 * Stringify a value for storage in text columns.
 * Returns null for null/undefined, String(value) otherwise.
 */
export function toText (value) {
  if (value === null || value === undefined) return null
  return String(value)
}

/**
 * Diff two objects, returning an array of { field, oldValue, newValue }
 * for fields that actually changed. Only compares fields present in `after`.
 * Skips metadata fields (id, createdAt, updatedAt).
 */
export function diffFields (before, after) {
  const diffs = []
  for (const field of Object.keys(after)) {
    if (SKIP_FIELDS.has(field)) continue
    const oldVal = toText(before[field])
    const newVal = toText(after[field])
    if (oldVal !== newVal) {
      diffs.push({ field, oldValue: oldVal, newValue: newVal })
    }
  }
  return diffs
}
