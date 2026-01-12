import crypto from 'crypto'

/**
 * Generate a deterministic hash ID for an upload
 * Combines userId, filename, and timestamp to create a unique identifier
 *
 * @param {string} userId - The user ID
 * @param {string} filename - The original filename
 * @param {number} timestamp - Unix timestamp (seconds)
 * @returns {string} A deterministic 12-character hash
 */
export function hashUploadName (userId, filename, timestamp) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string')
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('filename must be a non-empty string')
  }

  if (!timestamp || typeof timestamp !== 'number') {
    throw new Error('timestamp must be a number')
  }

  // Combine inputs for deterministic hash
  const input = `${userId}:${filename}:${timestamp}`

  // Create SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(input)
    .digest('hex')

  // Return first 12 characters
  return hash.substring(0, 12)
}
