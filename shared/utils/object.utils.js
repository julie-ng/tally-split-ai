/**
 * Returns true if a plain object has at least one own enumerable key.
 * Returns false for null/undefined — treated as empty so callers can use
 * `hasKeys(maybeObj)` without guard clauses.
 *
 * @param {Object|null|undefined} obj
 * @param {Object} [options]
 * @param {boolean} [options.silent=false] Suppress the null/undefined warning.
 *   Pass `true` when null is a valid expected state (e.g. nullable DB fields).
 */
export function hasKeys (obj, { silent = false } = {}) {
  if (obj == null) {
    if (!silent) console.warn('[hasKeys] received null/undefined; returning false', obj)
    return false
  }
  return Object.keys(obj).length > 0
}
