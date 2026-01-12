import crypto from 'crypto'

/**
 * ‼️ Currently not used
 *
 * Hash a username to create an obfuscated user ID
 * Uses SHA-256 with optional salt for security
 *
 * @param {string} username - The username to hash
 * @returns {string} A deterministic 12-character hash
 */
export function hashUsername (username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username must be a non-empty string')
  }

  // Optional: Add salt from environment variable for extra security
  const salt = process.env.USERNAME_HASH_SALT || ''
  const input = `${username}${salt}`

  // Create SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(input)
    .digest('hex')

  // Return first 12 characters
  return hash.substring(0, 12)
}
