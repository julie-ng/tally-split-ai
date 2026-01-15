import { describe, it, expect } from 'vitest'
import { azureUtils } from './azure.utils.js'

describe('azureUtils.blobTagsJsonToObject', () => {
  it('should convert JSON string to array of key-value objects', () => {
    const jsonString = '{"user-id":"julie-ng","receipt-date":"2025-11-18","receipt-total":"7.75","receipt-tags":"special+initals"}'

    const result = azureUtils.blobTagsJsonToObject(jsonString)

    expect(result).toEqual([
      { key: 'user-id', value: 'julie-ng' },
      { key: 'receipt-date', value: '2025-11-18' },
      { key: 'receipt-total', value: '7.75' },
      { key: 'receipt-tags', value: 'special+initals' },
    ])
  })

  it('should return empty array for null input', () => {
    const result = azureUtils.blobTagsJsonToObject(null)
    expect(result).toEqual([])
  })

  it('should return empty array for undefined input', () => {
    const result = azureUtils.blobTagsJsonToObject(undefined)
    expect(result).toEqual([])
  })

  it('should return empty array for empty string', () => {
    const result = azureUtils.blobTagsJsonToObject('')
    expect(result).toEqual([])
  })

  it('should handle empty JSON object', () => {
    const jsonString = '{}'
    const result = azureUtils.blobTagsJsonToObject(jsonString)
    expect(result).toEqual([])
  })

  it('should handle single tag', () => {
    const jsonString = '{"user-id":"julie-ng"}'
    const result = azureUtils.blobTagsJsonToObject(jsonString)
    expect(result).toEqual([
      { key: 'user-id', value: 'julie-ng' },
    ])
  })

  it('should preserve special characters in values', () => {
    const jsonString = '{"receipt-tags":"special+initals","currency":"€"}'
    const result = azureUtils.blobTagsJsonToObject(jsonString)
    expect(result).toEqual([
      { key: 'receipt-tags', value: 'special+initals' },
      { key: 'currency', value: '€' },
    ])
  })
})

describe('azureUtils.getReceiptTotalBlobTag', () => {
  it('should return receipt-total value when present', () => {
    // eslint-disable-next-line @stylistic/quotes
    const jsonString = "{\"user-id\":\"julie-ng\",\"receipt-date\":\"2025-11-18\",\"receipt-total\":\"7.75\",\"receipt-tags\":\"special+initals\"}"
    const result = azureUtils.getReceiptTotalBlobTag(jsonString)
    expect(result).toBe('7.75')
  })

  it('should return null when receipt-total is not present', () => {
    // eslint-disable-next-line @stylistic/quotes
    const jsonString = "{\"user-id\":\"julie-ng\",\"receipt-date\":\"2025-11-18\"}"
    const result = azureUtils.getReceiptTotalBlobTag(jsonString)
    expect(result).toBeNull()
  })

  it('should return null for empty JSON object', () => {
    const jsonString = '{}'
    const result = azureUtils.getReceiptTotalBlobTag(jsonString)
    expect(result).toBeNull()
  })

  it('should return null for null input', () => {
    const result = azureUtils.getReceiptTotalBlobTag(null)
    expect(result).toBeNull()
  })

  it('should return null for undefined input', () => {
    const result = azureUtils.getReceiptTotalBlobTag(undefined)
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = azureUtils.getReceiptTotalBlobTag('')
    expect(result).toBeNull()
  })
})
