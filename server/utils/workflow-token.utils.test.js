import { describe, it, expect, beforeAll } from 'vitest'
import { generateCallbackToken, verifyCallbackToken, isTokenExpired } from './workflow-token.utils.js'

beforeAll(() => {
  process.env.WORKFLOW_CALLBACK_SALT = 'test-salt-for-unit-tests'
})

const sampleParams = {
  runUuid: '550e8400-e29b-41d4-a716-446655440000',
  runCreatedAt: '2026-04-11T10:00:00.000Z',
  blobUrl: 'https://storage.blob.core.windows.net/receipts/test.jpg',
}

describe('generateCallbackToken', () => {
  it('should produce a 64-character hex string', () => {
    const token = generateCallbackToken(sampleParams)
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should be deterministic — same inputs produce same output', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken(sampleParams)
    expect(a).toBe(b)
  })

  it('should produce different tokens for different inputs', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, runUuid: 'different-uuid' })
    expect(a).not.toBe(b)
  })

  it('should produce different tokens for different blobUrls', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, blobUrl: 'https://other.blob/test.jpg' })
    expect(a).not.toBe(b)
  })

  it('should produce different tokens for different createdAt', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, runCreatedAt: '2026-04-12T10:00:00.000Z' })
    expect(a).not.toBe(b)
  })
})

describe('verifyCallbackToken', () => {
  it('should return true for a valid token', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, sampleParams)).toBe(true)
  })

  it('should return false for a tampered token', () => {
    const token = generateCallbackToken(sampleParams)
    const tampered = token.slice(0, -2) + 'ff'
    expect(verifyCallbackToken(tampered, sampleParams)).toBe(false)
  })

  it('should return false for wrong runUuid', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, { ...sampleParams, runUuid: 'wrong-uuid' })).toBe(false)
  })

  it('should return false for wrong blobUrl', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, { ...sampleParams, blobUrl: 'https://wrong.blob/x.jpg' })).toBe(false)
  })

  it('should return false for wrong createdAt', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, { ...sampleParams, runCreatedAt: '2099-01-01T00:00:00.000Z' })).toBe(false)
  })
})

describe('isTokenExpired', () => {
  it('should not be expired for a recent createdAt', () => {
    const createdAt = new Date() // just now
    const { expired } = isTokenExpired(createdAt, 15)
    expect(expired).toBe(false)
  })

  it('should be expired for a createdAt older than expiry window', () => {
    const createdAt = new Date(Date.now() - 20 * 60 * 1000) // 20 min ago
    const { expired } = isTokenExpired(createdAt, 15)
    expect(expired).toBe(true)
  })

  it('should return correct expiredAt timestamp', () => {
    const createdAt = new Date('2026-04-11T10:00:00.000Z')
    const { expiredAt } = isTokenExpired(createdAt, 15)
    expect(expiredAt).toEqual(new Date('2026-04-11T10:15:00.000Z'))
  })

  it('should use custom expiry minutes', () => {
    const createdAt = new Date(Date.now() - 5 * 60 * 1000) // 5 min ago
    expect(isTokenExpired(createdAt, 10).expired).toBe(false)
    expect(isTokenExpired(createdAt, 3).expired).toBe(true)
  })

  it('should treat 0 minutes as immediately expired', () => {
    const createdAt = new Date(Date.now() - 1000) // 1 second ago
    const { expired } = isTokenExpired(createdAt, 0)
    expect(expired).toBe(true)
  })
})
