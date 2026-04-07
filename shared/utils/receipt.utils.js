/**
 * Format a number as currency with symbol
 * @param {number|string} amount - The amount to format
 * @param {string} currencySymbol - The currency symbol (default: '€')
 * @returns {string} - Formatted currency string (e.g., "5.00 €")
 */
function formatCurrency (amount, currencySymbol = '€') {
  if (amount === '-' || amount === null || amount === undefined) {
    return '-'
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${numericAmount.toFixed(2)} ${currencySymbol}`
}

function extractTotalsAsArray (receipt) {
  return [
    {
      key: 'Subtotal',
      value: receipt.subtotal != null
        ? receipt.subtotal.toFixed(2)
        : '-',
    },
    {
      key: 'Tax',
      value: receipt.tax != null
        ? receipt.tax.toFixed(2)
        : '-',
    },
    {
      key: 'Total',
      value: receipt.total != null
        ? receipt.total.toFixed(2)
        : '-',
    },
  ]
}

/**
 * Convert Azure blob tags to comma-separated receipt tags
 * @param {Object|null} azureTags - The azureTags jsonb object from uploads table
 * @returns {string|null} - Comma-separated tags string, or null
 */
function azureTagsToReceiptTags (azureTags) {
  return azureTags?.['receipt-tags']?.replace(/\+/g, ', ') || null
}

/**
 * Split comma-separated receipt tags into a trimmed array for display
 * @param {string|null} tags - Comma-separated tags string from receipts.tags
 * @returns {string[]} - Array of trimmed tag strings
 */
function receiptTagsToDisplayArray (tags) {
  if (!tags) return []
  return tags.split(',').map(t => t.trim())
}

export const receiptUtils = {
  azureTagsToReceiptTags,
  extractTotalsAsArray,
  formatCurrency,
  receiptTagsToDisplayArray,
}
