export function extractTransactionTime (fields) {
  if (!fields?.TransactionTime) return null
  return {
    content: fields.TransactionTime.content || null,
    valueTime: fields.TransactionTime.valueTime || null,
  }
}
