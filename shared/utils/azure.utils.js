/**
 * Reduces a blob path to its filename — the last `/`-delimited segment.
 * e.g. "userId123/uploadId456/receipt.jpg" -> "receipt.jpg"
 *
 * Takes the LAST segment rather than stripping one prefix, so it stays correct
 * against the current `{userId}/{uploadId}/{filename}` layout (see
 * buildBlobPath) as well as the single-prefix paths it was written for.
 *
 * @param {string} blobName - The full blob path
 * @returns {string} The filename alone
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
