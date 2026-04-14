export function extractTransactionDate (fields) {
  if (!fields?.TransactionDate) return null
  return {
    content: fields.TransactionDate.content || null,
    valueDate: fields.TransactionDate.valueDate || null,
  }
}
