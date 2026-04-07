import { describe, it, expect } from 'vitest'
import { hashUploadName } from './hash-upload-name.js'

describe('hashUploadName', () => {
  it('should return a 12-character hex string', () => {
    const result = hashUploadName('julie-ng', 'receipt.jpg', 1700000000)
    expect(result).toHaveLength(12)
    expect(result).toMatch(/^[0-9a-f]{12}$/)
  })

  it('should be deterministic (same inputs produce same output)', () => {
    const a = hashUploadName('julie-ng', 'receipt.jpg', 1700000000)
    const b = hashUploadName('julie-ng', 'receipt.jpg', 1700000000)
    expect(a).toBe(b)
  })

  it('should produce different hashes for different userIds', () => {
    const a = hashUploadName('julie-ng', 'receipt.jpg', 1700000000)
    const b = hashUploadName('other-user', 'receipt.jpg', 1700000000)
    expect(a).not.toBe(b)
  })

  it('should produce different hashes for different filenames', () => {
    const a = hashUploadName('julie-ng', 'receipt-1.jpg', 1700000000)
    const b = hashUploadName('julie-ng', 'receipt-2.jpg', 1700000000)
    expect(a).not.toBe(b)
  })

  it('should produce different hashes for different timestamps', () => {
    const a = hashUploadName('julie-ng', 'receipt.jpg', 1700000000)
    const b = hashUploadName('julie-ng', 'receipt.jpg', 1700000001)
    expect(a).not.toBe(b)
  })

  it('should handle filenames with special characters', () => {
    const result = hashUploadName('julie-ng', '2025-11-18 DM (7.75) #special #initals.jpg', 1700000000)
    expect(result).toHaveLength(12)
    expect(result).toMatch(/^[0-9a-f]{12}$/)
  })

  it('should throw for empty userId', () => {
    expect(() => hashUploadName('', 'receipt.jpg', 1700000000)).toThrow('userId must be a non-empty string')
  })

  it('should throw for null userId', () => {
    expect(() => hashUploadName(null, 'receipt.jpg', 1700000000)).toThrow('userId must be a non-empty string')
  })

  it('should throw for empty filename', () => {
    expect(() => hashUploadName('julie-ng', '', 1700000000)).toThrow('filename must be a non-empty string')
  })

  it('should throw for null filename', () => {
    expect(() => hashUploadName('julie-ng', null, 1700000000)).toThrow('filename must be a non-empty string')
  })

  it('should throw for null timestamp', () => {
    expect(() => hashUploadName('julie-ng', 'receipt.jpg', null)).toThrow('timestamp must be a number')
  })

  it('should throw for string timestamp', () => {
    expect(() => hashUploadName('julie-ng', 'receipt.jpg', '1700000000')).toThrow('timestamp must be a number')
  })
})
