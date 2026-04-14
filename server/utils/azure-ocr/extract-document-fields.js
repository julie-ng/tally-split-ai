/**
 * Extract the document fields object from an Azure Document Intelligence response.
 * @param {Object} ocrJson - Full Azure DI response body
 * @returns {Object|null} Fields object or null if not found
 */
export function extractDocumentFields (ocrJson) {
  return ocrJson?.analyzeResult?.documents?.[0]?.fields || null
}
