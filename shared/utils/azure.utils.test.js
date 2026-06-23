import { describe, it, expect } from 'vitest'
import { azureUtils } from './azure.utils.js'

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

describe('azureUtils.buildBlobPath', () => {
  it('should join userId, uploadId, and filename with slashes', () => {
    const result = azureUtils.buildBlobPath('user-abc', 'upload-123', 'receipt.jpg')
    expect(result).toBe('user-abc/upload-123/receipt.jpg')
  })
})
