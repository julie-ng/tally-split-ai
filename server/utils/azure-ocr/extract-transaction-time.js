/**
 * Extract transaction time from Azure DI fields.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ content: string, valueTime: string }|null}
 */
export function extractTransactionTime (fields) {
  if (!fields?.TransactionTime) return null
  return {
    content: fields.TransactionTime.content || null,
    valueTime: fields.TransactionTime.valueTime || null,
  }
}
