/**
 * Extract line items from Azure DI fields.
 * @param {Object} fields - Document fields from extractDocumentFields()
 * @returns {{ description: string|null, quantity: number|null, totalPrice: number|null }[]}
 */
export function extractFlattenedLineItems (fields) {
  const items = fields?.Items?.valueArray || []
  return items.map(item => ({
    description: item.valueObject?.Description?.content || null,
    quantity: item.valueObject?.Quantity?.valueNumber || null,
    totalPrice: item.valueObject?.TotalPrice?.valueCurrency?.amount || null,
  }))
}
