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
