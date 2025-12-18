/**
 * Extract date from filename in YYYY-MM-DD format
 * @param {string} filename - The filename to parse
 * @returns {string|null} - The extracted date or null
 */
export function extractReceiptDate(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Extract receipt total from filename if present
 * Looks for pattern: (amount) e.g., "(21.82)" or "(115)"
 * @param {string} filename - The filename to parse
 * @returns {string|null} - The extracted amount or null
 */
export function extractReceiptTotal(filename) {
  const match = filename.match(/\(([0-9.]+)\)/);
  return match ? match[1] : null;
}

/**
 * Extract hashtags from filename
 * Looks for patterns like "#special #initials" and returns an Array
 * @param {string} filename - The filename to parse
 * @returns {Array} - Array of hashtag values or empty array.
 */
export function extractHashtags(filename) {
  const results = []
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = [...filename.matchAll(hashtagPattern)];

  if (matches.length === 0) {
    return [];
  }

  const tags = matches.map(match => match[1]);
  return tags;
}

/**
 * Extract hashtags from filename for Azure Blob Storage
 * Looks for patterns like "#special #initials" and returns comma-separated values
 * @param {string} filename - The filename to parse
 * @returns {string|null} - "+"-separated hashtag values
 */
export function extractHashtagsForAzureBlobs(filename) {
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = [...filename.matchAll(hashtagPattern)];

  if (matches.length === 0) {
    return null;
  }

  const tags = matches.map(match => match[1]);
  return tags.join('+');
}
