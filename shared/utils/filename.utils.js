import crypto from 'node:crypto'

/**
 * Extract date from filename in YYYY-MM-DD format
 * @param {string} filename - The filename to parse
 * @returns {string|null} - The extracted date or null
 */
export function extractReceiptDate (filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Extract receipt total from filename if present
 * Looks for pattern: (amount) e.g., "(21.82)" or "(115)"
 * @param {string} filename - The filename to parse
 * @returns {string|null} - The extracted amount or null
 */
export function extractReceiptTotal (filename) {
  const match = filename.match(/\(([0-9.]+)\)/)
  return match ? match[1] : null
}

/**
 * Extract hashtags from filename
 * Looks for patterns like "#special #initials" and returns an Array
 * @param {string} filename - The filename to parse
 * @returns {Array} - Array of hashtag values or empty array.
 */
export function extractHashtags (filename) {
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g
  const matches = [...filename.matchAll(hashtagPattern)]

  if (matches.length === 0) {
    return []
  }

  const tags = matches.map(match => match[1])
  return tags
}

/**
 * Extract hashtags from filename for Azure Blob Storage
 * Looks for patterns like "#special #initials" and returns comma-separated values
 * @param {string} filename - The filename to parse
 * @returns {string|null} - "+"-separated hashtag values
 */
export function extractHashtagsForAzureBlobs (filename) {
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g
  const matches = [...filename.matchAll(hashtagPattern)]

  if (matches.length === 0) {
    return null
  }

  const tags = matches.map(match => match[1])
  return tags.join('+')
}

/**
 * Extract receipt title from filename by removing date, price, tags, and extension
 * @param {string} filename - The filename to parse
 * @returns {string} - The extracted title, trimmed
 */
export function extractReceiptTitle (filename) {
  let title = filename

  // Remove file extension
  title = title.replace(/\.[^.]+$/, '')

  // Remove YYYY-MM-DD date prefix
  title = title.replace(/^\d{4}-\d{2}-\d{2}\s*/, '')

  // Remove price in parentheses
  title = title.replace(/\([0-9.]+\)/, '')

  // Remove hashtags
  title = title.replace(/#[a-zA-Z0-9_-]+/g, '')

  // Clean up extra whitespace
  title = title.trim().replace(/\s+/g, ' ')

  return title
}

/**
 * Convert filename to a component-friendly key
 * Removes extra spaces, replaces spaces and special characters with dashes, and converts to lowercase
 * @param {string} filename - The filename to convert
 * @returns {string} - The component key in kebab-case
 */
export function filenameToComponentKey (filename) {
  return filename
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                    // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, '-')             // Replace special characters with dashes
    .replace(/-+/g, '-')                      // Replace multiple consecutive dashes with single dash
    .replace(/^-|-$/g, '')                   // Remove leading/trailing dashes
}

/**
 * Generate an 8-character hex hash from a string
 * @param {string} str - The string to hash
 * @returns {string} - An 8-character hexadecimal hash
 */
export function simpleHash (str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Create thumbnail filename from original filename
 *
 * @param {string} filename - Original filename
 * @returns {string} Thumbnail filename with -thumbnail suffix before extension
 */
export function createThumbnailFilename (filename) {
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) {
    return `${filename}-thumbnail.jpg`
  }
  const name = filename.substring(0, lastDotIndex)
  return `${name}-thumbnail.jpg`
}

/**
 * Create an Azure-friendly filename by replacing special characters with dashes
 * and appending a random suffix. Only accepts image files with .jpg, .jpeg, or .png extensions.
 * Keeps price and hashtag values, just removes parentheses and hash symbols.
 * @param {string} filename - The original filename to process
 * @returns {string} - The processed filename with random suffix
 * @throws {Error} - If filename doesn't have a valid image extension
 */
export function createAzureFilename (filename) {
  // Extract file extension first
  const extensionMatch = filename.match(/(\.[^.]+)$/)
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : ''

  // Validate that file has a proper image extension
  const validExtensions = ['.jpg', '.jpeg', '.png']
  if (!validExtensions.includes(extension)) {
    throw new Error(`Invalid file extension. Only ${validExtensions.join(', ')} are allowed.`)
  }

  // Remove extension for processing
  let processedName = filename.slice(0, -extension.length)

  // Normalize Unicode (e.g. combining diaeresis → precomposed) before replacing
  processedName = processedName.normalize('NFC')

  // Replace German umlauts and eszett
  processedName = processedName
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')

  // Remove parentheses but keep the price value
  processedName = processedName.replace(/[()]/g, '-')

  // Remove hash symbols but keep the tag values
  processedName = processedName.replace(/#/g, '-')

  // Replace whitespace with dashes
  processedName = processedName.replace(/\s+/g, '-')

  // Clean up multiple consecutive dashes
  processedName = processedName.replace(/-+/g, '-')

  // Remove leading/trailing dashes
  processedName = processedName.replace(/^-+|-+$/g, '')

  // Generate random 6-character suffix using crypto.randomBytes
  const randomSuffix = crypto.randomBytes(3).toString('hex')

  // Combine processed name with random suffix and extension
  return `${processedName}-${randomSuffix}${extension}`
}
