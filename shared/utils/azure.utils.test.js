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

describe('azureUtils.stripSasToken', () => {
  it('should remove SAS query params from a blob URL', () => {
    const result = azureUtils.stripSasToken('https://tallysplitdev.blob.core.windows.net/receipts/foo/bar.jpg?sv=2026-06-06&sig=abc123')
    expect(result).toBe('https://tallysplitdev.blob.core.windows.net/receipts/foo/bar.jpg')
    expect(result).not.toContain('sig=')
    expect(result).not.toContain('sv=')
  })

  it('should leave a URL with no query string unchanged', () => {
    const result = azureUtils.stripSasToken('https://tallysplitdev.blob.core.windows.net/receipts/foo/bar.jpg')
    expect(result).toBe('https://tallysplitdev.blob.core.windows.net/receipts/foo/bar.jpg')
  })

  it('should return non-URL strings unchanged', () => {
    const result = azureUtils.stripSasToken('/9j/4AAQSkZJRgABAQEAYABgAAD')
    expect(result).toBe('/9j/4AAQSkZJRgABAQEAYABgAAD')
  })

  it('should return empty/invalid input unchanged', () => {
    expect(azureUtils.stripSasToken('')).toBe('')
    expect(azureUtils.stripSasToken(null)).toBe(null)
    expect(azureUtils.stripSasToken(undefined)).toBe(undefined)
  })
})
