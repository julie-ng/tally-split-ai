/**
 * Convert a thrown error into a plain object safe for Pinia state.
 *
 * Pinia state is serialized into the SSR payload via devalue, which throws
 * on non-POJOs (FetchError, Error, etc.). Storing the raw error crashes the
 * page render with "Cannot stringify arbitrary non-POJOs" — masking the
 * underlying issue (often just a 401).
 *
 * Use in store catch blocks:
 *   catch (err) {
 *     error.value = toPiniaError(err)
 *     throw err
 *   }
 */
export function toPiniaError (err) {
  // console.log('[piniaError]', err)
  if (!err) {
    return null
  }
  return {
    message: err.message ?? String(err),
    statusCode: err.statusCode ?? err.response?.status ?? null,
  }
}
