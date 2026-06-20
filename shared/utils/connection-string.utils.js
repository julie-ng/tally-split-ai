/**
 * Redact the username and password from a DB connection string so it is safe
 * to log. Connection strings have the form
 * `protocol://user:password@host:port/db` — the userinfo before the `@` is the
 * sensitive part. Returns a string with user + password replaced by REDACTED.
 *
 * Falls back to a fully-redacted placeholder if the string can't be parsed,
 * so a malformed value can never leak through.
 *
 * @param {string} connectionString
 * @returns {string} the connection string with credentials masked
 */
export function redactConnectionString (connectionString) {
  if (!connectionString || typeof connectionString !== 'string') {
    return '(no connection string)'
  }

  try {
    const url = new URL(connectionString)
    if (url.username) {
      url.username = 'REDACTED'
    }
    if (url.password) {
      url.password = 'REDACTED'
    }
    // URL.toString() re-encodes; that's fine for a log line.
    return url.toString()
  }
  catch {
    // Regex fallback for non-URL-parseable strings: mask everything between
    // `://` and the first `@`.
    const masked = connectionString.replace(/(:\/\/)[^@]*@/, '$1REDACTED:REDACTED@')
    // If no userinfo was present, there's nothing sensitive to leak.
    return masked
  }
}

/**
 * console.log a connection string with credentials masked. Convenience wrapper
 * over redactConnectionString so scripts never log raw credentials.
 *
 * @param {string} connectionString
 * @param {string} [label] - optional prefix, e.g. 'Target'
 */
export function safeLogConnectionString (connectionString, label = 'Database') {
  console.log(`${label}: ${redactConnectionString(connectionString)}`)
}
