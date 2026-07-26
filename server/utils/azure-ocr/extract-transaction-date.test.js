import { describe, it, expect } from 'vitest'
import { extractTransactionDate } from './extract-transaction-date.js'

describe('extractTransactionDate', () => {
  it('should extract content, valueDate, and confidence', () => {
    expect(extractTransactionDate({
      TransactionDate: { content: '07.11.2025', valueDate: '2025-11-07', confidence: 0.984 },
    })).toEqual({
      content: '07.11.2025',
      valueDate: '2025-11-07',
      confidence: 0.984,
    })
  })

  it('should return null if TransactionDate is missing', () => {
    expect(extractTransactionDate({})).toBeNull()
    expect(extractTransactionDate(null)).toBeNull()
  })

  it('should handle missing sub-fields gracefully', () => {
    expect(extractTransactionDate({ TransactionDate: {} })).toEqual({
      content: null,
      valueDate: null,
      confidence: null,
    })
  })

  it('should preserve confidence of 0 (not coerce to null)', () => {
    expect(extractTransactionDate({
      TransactionDate: { content: 'x', valueDate: null, confidence: 0 },
    })).toEqual({
      content: 'x',
      valueDate: null,
      confidence: 0,
    })
  })
})
