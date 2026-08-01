import { describe, it, expect } from 'vitest'
import { receiptUtils } from './receipt.utils.js'

describe('formatCurrency()', () => {
  it('should format integer with two decimal places', () => {
    const result = receiptUtils.formatCurrency(5)
    expect(result).toBe('5.00 €')
  })

  it('should format decimal with one decimal place', () => {
    const result = receiptUtils.formatCurrency(133.5)
    expect(result).toBe('133.50 €')
  })

  it('should format decimal with two decimal places', () => {
    const result = receiptUtils.formatCurrency(99.99)
    expect(result).toBe('99.99 €')
  })

  it('should handle string input', () => {
    const result = receiptUtils.formatCurrency('5')
    expect(result).toBe('5.00 €')
  })

  it('should handle string decimal input', () => {
    const result = receiptUtils.formatCurrency('133.5')
    expect(result).toBe('133.50 €')
  })

  it('should use custom currency symbol', () => {
    const result = receiptUtils.formatCurrency(10, '$')
    expect(result).toBe('10.00 $')
  })

  it('should handle zero', () => {
    const result = receiptUtils.formatCurrency(0)
    expect(result).toBe('0.00 €')
  })

  it('should round to two decimal places', () => {
    const result = receiptUtils.formatCurrency(5.999)
    expect(result).toBe('6.00 €')
  })

  it('should handle large numbers', () => {
    const result = receiptUtils.formatCurrency(1234.56)
    expect(result).toBe('1234.56 €')
  })
})

describe('extractTotalsAsArray()', () => {
  const receipt = { subtotal: 10, tax: 1.9, tip: 2, total: 13.9 }

  it('should return rows in display order with the grand total last', () => {
    const result = receiptUtils.extractTotalsAsArray(receipt)
    expect(result.map(r => r.key)).toEqual(['Subtotal', 'Tax', 'Tip', 'Total'])
  })

  it('should return RAW values, not formatted strings', () => {
    const result = receiptUtils.extractTotalsAsArray(receipt)
    expect(result[0].value).toBe(10)
    expect(result[1].value).toBe(1.9)
  })

  it('should omit Tip when the receipt has none', () => {
    const result = receiptUtils.extractTotalsAsArray({ subtotal: 10, tax: 1.9, total: 11.9 })
    expect(result.map(r => r.key)).toEqual(['Subtotal', 'Tax', 'Total'])
  })

  it('should omit Tip when it is null', () => {
    const result = receiptUtils.extractTotalsAsArray({ ...receipt, tip: null })
    expect(result.map(r => r.key)).not.toContain('Tip')
  })

  // A recorded zero tip is a fact ("they tipped nothing"), unlike a missing one.
  it('should KEEP a zero tip', () => {
    const result = receiptUtils.extractTotalsAsArray({ ...receipt, tip: 0 })
    expect(result.map(r => r.key)).toContain('Tip')
  })

  it('should flag only the grand total with isTotal', () => {
    const result = receiptUtils.extractTotalsAsArray(receipt)
    expect(result.filter(r => r.isTotal).map(r => r.key)).toEqual(['Total'])
  })

  it('should include Total even when the receipt lacks one, as long as some field is set', () => {
    const result = receiptUtils.extractTotalsAsArray({ subtotal: 10 })
    const total = result.find(r => r.key === 'Total')
    expect(total).toBeDefined()
    expect(total.value).toBeUndefined()
  })

  it('should return an empty array for a missing receipt', () => {
    expect(receiptUtils.extractTotalsAsArray(null)).toEqual([])
    expect(receiptUtils.extractTotalsAsArray(undefined)).toEqual([])
  })

  // Not yet analyzed (or OCR failed) — a column of dashes says nothing.
  it('should return an empty array when NO money field is set', () => {
    expect(receiptUtils.extractTotalsAsArray({ merchantName: 'Cafe' })).toEqual([])
    expect(receiptUtils.extractTotalsAsArray({ subtotal: null, tax: null, tip: null, total: null })).toEqual([])
  })

  it('should render rows when only a zero is set, since zero is a real value', () => {
    const result = receiptUtils.extractTotalsAsArray({ total: 0 })
    expect(result.map(r => r.key)).toEqual(['Subtotal', 'Tax', 'Total'])
  })
})
