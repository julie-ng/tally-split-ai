import { describe, it, expect } from 'vitest'
import { extractTransactionTime } from './extract-transaction-time.js'

describe('extractTransactionTime', () => {
  it('should extract content and valueTime', () => {
    expect(extractTransactionTime({
      TransactionTime: { content: '17:45 Uhr', valueTime: '17:45:00' },
    })).toEqual({
      content: '17:45 Uhr',
      valueTime: '17:45:00',
    })
  })

  it('should return null if TransactionTime is missing', () => {
    expect(extractTransactionTime({})).toBeNull()
    expect(extractTransactionTime(null)).toBeNull()
  })

  it('should handle missing sub-fields gracefully', () => {
    expect(extractTransactionTime({ TransactionTime: {} })).toEqual({
      content: null,
      valueTime: null,
    })
  })
})
