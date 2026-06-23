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
 * Builds the canonical Azure blob path for an upload's file (original or thumbnail).
 * Layout: {userId}/{uploadId}/{filename}
 *
 * Used by both the server (to mint paths in /api/blobs/new) and the client
 * (to upload thumbnails). Keep these in lockstep — divergence here means
 * thumbnails land somewhere the rest of the app can't find them.
 *
 * @param {string} userId - Owner user id
 * @param {string} uploadId - Server-generated upload nanoid
 * @param {string} filename - Azure-safe filename
 * @returns {string} The blob path
 */
function buildBlobPath (userId, uploadId, filename) {
  return `${userId}/${uploadId}/${filename}`
}

export const azureUtils = {
  removeUsernamePrefixFromBlobname,
  buildBlobPath,
}
