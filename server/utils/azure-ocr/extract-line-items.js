export function extractLineItems (fields) {
  const items = fields?.Items?.valueArray || []
  return items.map(item => ({
    description: item.valueObject?.Description?.content || null,
    quantity: item.valueObject?.Quantity?.valueNumber || null,
    totalPrice: item.valueObject?.TotalPrice?.valueCurrency?.amount || null,
  }))
}
