export function extractDocumentFields (ocrJson) {
  return ocrJson?.analyzeResult?.documents?.[0]?.fields || null
}
