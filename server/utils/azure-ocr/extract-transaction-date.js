/**
 * Extract transaction date from Azure DI fields.
 * `confidence` (0–1) is Azure DI's own read confidence — the normalize LLM uses
 * it as a "how faded/reliable is this?" signal to decide whether to trust the
 * year as-is or second-guess it. Carried through, not dropped.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ content: string, valueDate: string, confidence: number|null }|null}
 */
export function extractTransactionDate (fields) {
  if (!fields?.TransactionDate) return null
  return {
    content: fields.TransactionDate.content || null,
    valueDate: fields.TransactionDate.valueDate || null,
    confidence: fields.TransactionDate.confidence ?? null,
  }
}
