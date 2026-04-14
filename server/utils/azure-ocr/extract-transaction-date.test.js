import { describe, it, expect } from 'vitest'
import { extractTransactionDate } from './extract-transaction-date.js'

describe('extractTransactionDate', () => {
  it('should extract content and valueDate', () => {
    expect(extractTransactionDate({
      TransactionDate: { content: '07.11.2025', valueDate: '2025-11-07' },
    })).toEqual({
      content: '07.11.2025',
      valueDate: '2025-11-07',
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
    })
  })
})
