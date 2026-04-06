/**
 * Takes blob tags (object or JSON string) and returns array of key-value objects
 *
 * @param {Object|string} tags - Tags as object (jsonb) or JSON string
 * @returns Array
 */

function blobTagsJsonToObject (tags) {
  if (!tags) return []
  const data = typeof tags === 'string' ? JSON.parse(tags) : tags
  return Object.entries(data).map(([key, value]) => ({ key, value }))
}

function getReceiptTotalBlobTag (jsonString) {
  const tagsObject = blobTagsJsonToObject(jsonString)
  const total = tagsObject.find(tag => tag.key === 'receipt-total')
  return total
    ? total.value
    : null
}

/**
 * Removes the username prefix from a blob path
 * e.g. "userId123/receipt.jpg" -> "receipt.jpg"
 *
 * @param {string} blobName - The full blob path including username prefix
 * @returns {string} The filename without the username prefix
 */
function removeUsernamePrefixFromBlobname (blobName) {
  return blobName.split('/').pop()
}

/**
 * Internal blob tag keys that should be excluded from UI display
 */
const INTERNAL_BLOB_TAGS = ['user-id']

/**
 * Excludes internal blob tags from display
 * Accepts either a JSON string or an object of tags
 *
 * @param {string|Object} tags - Tags as JSON string or object
 * @returns {string|Object} Filtered tags in the same format as input
 */
function excludeInternalBlobTags (tags) {
  if (!tags) return tags

  // Handle string input (JSON)
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags)
      const filtered = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (!INTERNAL_BLOB_TAGS.includes(key)) {
          filtered[key] = value
        }
      }
      return JSON.stringify(filtered)
    }
    catch (error) {
      // If parsing fails, return original
      // Suppress warning during tests
      if (typeof process !== 'undefined' && process.env?.VITEST !== 'true') {
        console.warn(error)
      }
      return tags
    }
  }

  // Handle object input
  if (typeof tags === 'object' && !Array.isArray(tags)) {
    const filtered = {}
    for (const [key, value] of Object.entries(tags)) {
      if (!INTERNAL_BLOB_TAGS.includes(key)) {
        filtered[key] = value
      }
    }
    return filtered
  }

  // For any other type, return as-is
  return tags
}

export const azureUtils = {
  blobTagsJsonToObject,
  getReceiptTotalBlobTag,
  removeUsernamePrefixFromBlobname,
  excludeInternalBlobTags,
}
