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

  describe('object input (jsonb from Postgres)', () => {
    it('should convert object to array of key-value objects', () => {
      const tags = {
        'user-id': 'julie-ng',
        'receipt-date': '2025-11-18',
        'receipt-total': '7.75',
        'receipt-tags': 'special+initals',
      }
      const result = azureUtils.blobTagsJsonToObject(tags)
      expect(result).toEqual([
        { key: 'user-id', value: 'julie-ng' },
        { key: 'receipt-date', value: '2025-11-18' },
        { key: 'receipt-total', value: '7.75' },
        { key: 'receipt-tags', value: 'special+initals' },
      ])
    })

    it('should handle empty object', () => {
      const result = azureUtils.blobTagsJsonToObject({})
      expect(result).toEqual([])
    })

    it('should handle single tag object', () => {
      const result = azureUtils.blobTagsJsonToObject({ 'user-id': 'julie-ng' })
      expect(result).toEqual([
        { key: 'user-id', value: 'julie-ng' },
      ])
    })
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

  describe('object input (jsonb from Postgres)', () => {
    it('should return receipt-total value from object', () => {
      const tags = {
        'user-id': 'julie-ng',
        'receipt-date': '2025-11-18',
        'receipt-total': '7.75',
        'receipt-tags': 'special+initals',
      }
      const result = azureUtils.getReceiptTotalBlobTag(tags)
      expect(result).toBe('7.75')
    })

    it('should return null when receipt-total not in object', () => {
      const tags = { 'user-id': 'julie-ng', 'receipt-date': '2025-11-18' }
      const result = azureUtils.getReceiptTotalBlobTag(tags)
      expect(result).toBeNull()
    })

    it('should return null for empty object', () => {
      const result = azureUtils.getReceiptTotalBlobTag({})
      expect(result).toBeNull()
    })
  })
})

describe('azureUtils.removeUsernamePrefixFromBlobname', () => {
  it('should remove username prefix from blob path', () => {
    const result = azureUtils.removeUsernamePrefixFromBlobname('userId123/receipt.jpg')
    expect(result).toBe('receipt.jpg')
  })

  it('should handle multiple path segments', () => {
    const result = azureUtils.removeUsernamePrefixFromBlobname('userId123/subfolder/receipt.jpg')
    expect(result).toBe('receipt.jpg')
  })

  it('should return filename as-is when no prefix exists', () => {
    const result = azureUtils.removeUsernamePrefixFromBlobname('receipt.jpg')
    expect(result).toBe('receipt.jpg')
  })

  it('should handle filenames with special characters', () => {
    const result = azureUtils.removeUsernamePrefixFromBlobname('julie-ng/my-receipt-(41.95).jpg')
    expect(result).toBe('my-receipt-(41.95).jpg')
  })

  it('should handle empty string', () => {
    const result = azureUtils.removeUsernamePrefixFromBlobname('')
    expect(result).toBe('')
  })

  it('should handle path ending with slash', () => {
    const result = azureUtils.removeUsernamePrefixFromBlobname('userId123/')
    expect(result).toBe('')
  })
})

describe('azureUtils.excludeInternalBlobTags', () => {
  describe('string input (JSON)', () => {
    it('should exclude user-id from JSON string', () => {
      const jsonString = '{"user-id":"julie-ng","receipt-total":"7.75","receipt-tags":"special"}'
      const result = azureUtils.excludeInternalBlobTags(jsonString)
      const parsed = JSON.parse(result)

      expect(parsed).not.toHaveProperty('user-id')
      expect(parsed).toHaveProperty('receipt-total', '7.75')
      expect(parsed).toHaveProperty('receipt-tags', 'special')
    })

    it('should handle JSON with only internal tags', () => {
      const jsonString = '{"user-id":"julie-ng"}'
      const result = azureUtils.excludeInternalBlobTags(jsonString)
      const parsed = JSON.parse(result)

      expect(parsed).toEqual({})
    })

    it('should handle empty JSON object', () => {
      const jsonString = '{}'
      const result = azureUtils.excludeInternalBlobTags(jsonString)

      expect(result).toBe('{}')
    })

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'not-valid-json'
      const result = azureUtils.excludeInternalBlobTags(invalidJson)

      expect(result).toBe(invalidJson)
    })

    it('should preserve all non-internal tags', () => {
      const jsonString = '{"user-id":"julie-ng","receipt-date":"2025-11-18","receipt-total":"7.75"}'
      const result = azureUtils.excludeInternalBlobTags(jsonString)
      const parsed = JSON.parse(result)

      expect(Object.keys(parsed)).toHaveLength(2)
      expect(parsed).toHaveProperty('receipt-date', '2025-11-18')
      expect(parsed).toHaveProperty('receipt-total', '7.75')
    })
  })

  describe('object input', () => {
    it('should exclude user-id from object', () => {
      const tags = {
        'user-id': 'julie-ng',
        'receipt-total': '7.75',
        'receipt-tags': 'special',
      }
      const result = azureUtils.excludeInternalBlobTags(tags)

      expect(result).not.toHaveProperty('user-id')
      expect(result).toHaveProperty('receipt-total', '7.75')
      expect(result).toHaveProperty('receipt-tags', 'special')
    })

    it('should handle object with only internal tags', () => {
      const tags = { 'user-id': 'julie-ng' }
      const result = azureUtils.excludeInternalBlobTags(tags)

      expect(result).toEqual({})
    })

    it('should handle empty object', () => {
      const tags = {}
      const result = azureUtils.excludeInternalBlobTags(tags)

      expect(result).toEqual({})
    })

    it('should preserve all non-internal tags', () => {
      const tags = {
        'user-id': 'julie-ng',
        'receipt-date': '2025-11-18',
        'receipt-total': '7.75',
      }
      const result = azureUtils.excludeInternalBlobTags(tags)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result).toHaveProperty('receipt-date', '2025-11-18')
      expect(result).toHaveProperty('receipt-total', '7.75')
    })
  })

  describe('edge cases', () => {
    it('should return null for null input', () => {
      const result = azureUtils.excludeInternalBlobTags(null)
      expect(result).toBeNull()
    })

    it('should return undefined for undefined input', () => {
      const result = azureUtils.excludeInternalBlobTags(undefined)
      expect(result).toBeUndefined()
    })

    it('should return array as-is (unsupported type)', () => {
      const tags = ['user-id', 'receipt-total']
      const result = azureUtils.excludeInternalBlobTags(tags)

      expect(result).toBe(tags)
    })

    it('should return number as-is (unsupported type)', () => {
      const result = azureUtils.excludeInternalBlobTags(123)
      expect(result).toBe(123)
    })
  })
})
