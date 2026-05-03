/**
 * Returns true if a plain object has at least one own enumerable key.
 * Logs a warning and returns false for null/undefined — treated as empty
 * so callers can use `hasKeys(maybeObj)` without guard clauses.
 */
export function hasKeys (obj) {
  if (obj == null) {
    console.warn('[hasKeys] received null/undefined; returning false', obj)
    return false
  }
  return Object.keys(obj).length > 0
}
