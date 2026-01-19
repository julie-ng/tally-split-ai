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

export const receiptUtils = {
  extractTotalsAsArray,
  formatCurrency,
}
