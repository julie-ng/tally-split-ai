/**
 * Format a number as currency with symbol
 * @param {number|string} amount - The amount to format
 * @param {string} currencySymbol - The currency symbol (default: '€')
 * @returns {string} - Formatted currency string (e.g., "5.00 €")
 */
function formatCurrency(amount, currencySymbol = '€') {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${numericAmount.toFixed(2)} ${currencySymbol}`
}

export const receiptUtils = {
  formatCurrency,
}
