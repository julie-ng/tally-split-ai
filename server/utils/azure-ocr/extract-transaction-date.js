/**
 * Extract transaction date from Azure DI fields.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ content: string, valueDate: string }|null}
 */
export function extractTransactionDate (fields) {
  if (!fields?.TransactionDate) return null
  return {
    content: fields.TransactionDate.content || null,
    valueDate: fields.TransactionDate.valueDate || null,
  }
}
