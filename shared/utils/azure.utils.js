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

/**
 * Strip the SAS token (query string) from an Azure blob URL so it's safe to
 * log — the token grants time-limited access, so leaking it into logs (e.g.
 * a public CI run) extends its exposure window even though it expires.
 * Non-Azure/unparseable strings are returned unchanged.
 *
 * @param {string} url - Blob URL, with or without a `?sv=...&sig=...` SAS token
 * @returns {string} The URL with its query string removed
 */
function stripSasToken (url) {
  if (!url || typeof url !== 'string') {
    return url
  }

  try {
    const parsed = new URL(url)
    parsed.search = ''
    return parsed.toString()
  }
  catch {
    return url
  }
}

export const azureUtils = {
  removeUsernamePrefixFromBlobname,
  buildBlobPath,
  stripSasToken,
}
