import { describe, it, expect, beforeAll } from 'vitest'
import { generateCallbackToken } from './generate-callback-token.js'
import { verifyCallbackToken } from './verify-callback-token.js'

beforeAll(() => {
  process.env.WORKFLOW_CALLBACK_SECRET = 'test-secret-for-unit-tests'
})

const sampleParams = {
  runUuid: '550e8400-e29b-41d4-a716-446655440000',
  runCreatedAt: '2026-04-11T10:00:00.000Z',
  scope: 'upload:abc123',
  actions: ['upload:read', 'receipt:write'],
}

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

  it('should return false for wrong actions', () => {
    const token = generateCallbackToken(sampleParams)
    expect(verifyCallbackToken(token, { ...sampleParams, actions: ['split:write'] })).toBe(false)
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
