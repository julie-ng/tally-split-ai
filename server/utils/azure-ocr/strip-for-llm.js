/**
 * Strip an Azure Document Intelligence OCR response down to the fields
 * relevant for LLM consumption, removing bulky positional data.
 *
 * Extracts Items, Total, Subtotal, Tax, and Tip from documents[0].fields,
 * then removes boundingRegions and spans to reduce token count (~86% reduction).
 *
 * @param {Object} ocrJson - Full Azure DI response body
 * @returns {Object|null} Stripped fields object or null if no document fields found
 */
export function stripForLlm (ocrJson) {
  const fields = ocrJson?.analyzeResult?.documents?.[0]?.fields
  if (!fields) return null

  const slim = {
    Items: fields.Items || null,
    Total: fields.Total || null,
    Subtotal: fields.Subtotal || null,
    Tax: fields.Tax || null,
    TotalTax: fields.TotalTax || null,
    Tip: fields.Tip || null,
  }

  // Remove boundingRegions and spans recursively
  return JSON.parse(JSON.stringify(slim, (key, value) => {
    if (key === 'boundingRegions' || key === 'spans') return undefined
    return value
  }))
}
