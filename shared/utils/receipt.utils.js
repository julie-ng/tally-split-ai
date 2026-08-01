/**
 * Format a number as currency with symbol
 * @param {number|string} amount - The amount to format
 * @param {string} currencySymbol - The currency symbol (default: '€')
 * @returns {string} - Formatted currency string (e.g., "5.00 €")
 */
function formatAmount (amount) {
  if (amount === null || amount === undefined) return '-'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${n.toFixed(2)} €`
}

function formatCurrency (amount, currencySymbol = '€') {
  if (amount === '-' || amount === null || amount === undefined) {
    return '-'
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${numericAmount.toFixed(2)} ${currencySymbol}`
}

const TOTAL_FIELDS = ['subtotal', 'tax', 'tip', 'total']

/**
 * Build a receipt's money rows in display order, grand total last.
 *
 * Values are returned RAW, not pre-formatted — the caller decides currency,
 * alignment and emphasis. Pass each `value` through `formatAmount`/`formatCurrency`
 * at render time.
 *
 * Returns an EMPTY ARRAY when the receipt is missing or carries no money fields
 * at all (OCR not yet run, or it failed) — a caller can render straight from an
 * unresolved store getter, and a receipt with nothing to show renders nothing
 * rather than a column of dashes.
 *
 * Tip is omitted unless the receipt has one: most receipts don't, and an empty
 * Tip row reads as "the tip was zero" rather than "no tip was recorded". A
 * recorded ZERO tip is kept — that's a fact, not an absence.
 *
 * @param {Object} receipt - Receipt with subtotal/tax/tip/total
 * @returns {Array<{ key: string, value: number|null|undefined, isTotal: boolean }>}
 */
function extractTotalsAsArray (receipt) {
  if (!receipt || TOTAL_FIELDS.every(field => receipt[field] == null)) {
    return []
  }

  const rows = [
    { key: 'Subtotal', value: receipt.subtotal },
    { key: 'Tax', value: receipt.tax },
  ]

  if (receipt.tip != null) {
    rows.push({ key: 'Tip', value: receipt.tip })
  }

  rows.push({ key: 'Total', value: receipt.total })

  return rows.map(row => ({ ...row, isTotal: row.key === 'Total' }))
}

export const receiptUtils = {
  extractTotalsAsArray,
  formatCurrency,
  formatAmount,
}
