import { describe, it, expect, beforeAll } from 'vitest'
import { generateCallbackToken, verifyCallbackToken, isTokenExpired } from './workflow-token.utils.js'

beforeAll(() => {
  process.env.WORKFLOW_CALLBACK_SALT = 'test-salt-for-unit-tests'
})

const sampleParams = {
  runUuid: '550e8400-e29b-41d4-a716-446655440000',
  runCreatedAt: '2026-04-11T10:00:00.000Z',
  scope: 'upload:abc123',
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

  it('should produce different tokens for different runUuid', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, runUuid: 'different-uuid' })
    expect(a).not.toBe(b)
  })

  it('should produce different tokens for different scope', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, scope: 'receipt:456' })
    expect(a).not.toBe(b)
  })

  it('should produce different tokens for different createdAt', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, runCreatedAt: '2026-04-12T10:00:00.000Z' })
    expect(a).not.toBe(b)
  })

  it('should throw if scope is missing', () => {
    expect(() => generateCallbackToken({ runUuid: 'x', runCreatedAt: 'y' })).toThrow('scope is required')
  })

  it('should handle scope with colons (e.g. receipt:123)', () => {
    const token = generateCallbackToken({ ...sampleParams, scope: 'receipt:123' })
    expect(token).toMatch(/^[a-f0-9]{64}$/)
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

  it('should return false for wrong scope', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, { ...sampleParams, scope: 'receipt:999' })).toBe(false)
  })

  it('should return false for wrong createdAt', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, { ...sampleParams, runCreatedAt: '2099-01-01T00:00:00.000Z' })).toBe(false)
  })

  it('should return false for null/undefined token', () => {
    expect(verifyCallbackToken(null, sampleParams)).toBe(false)
    expect(verifyCallbackToken(undefined, sampleParams)).toBe(false)
  })

  it('should return false for empty string token', () => {
    expect(verifyCallbackToken('', sampleParams)).toBe(false)
  })

  it('should return false for non-hex token', () => {
    expect(verifyCallbackToken('not-a-hex-token!@#$', sampleParams)).toBe(false)
  })

  it('should return false for wrong-length hex token', () => {
    expect(verifyCallbackToken('abcdef1234', sampleParams)).toBe(false)
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

  it('should treat 0 minutes as immediately expired — falls back to default 15', () => {
    const createdAt = new Date(Date.now() - 1000) // 1 second ago
    const { expired } = isTokenExpired(createdAt, 0)
    // 0 is not > 0, so falls back to 15 minutes — 1 second ago is not expired
    expect(expired).toBe(false)
  })

  it('should fall back to 15 minutes for NaN expiry', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 1000) // 10 min ago
    const { expired } = isTokenExpired(createdAt, NaN)
    expect(expired).toBe(false) // 10 min < 15 min default
  })

  it('should fall back to 15 minutes for negative expiry', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 1000) // 10 min ago
    const { expired } = isTokenExpired(createdAt, -5)
    expect(expired).toBe(false) // 10 min < 15 min default
  })
})
