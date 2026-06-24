import { describe, it, expect, beforeAll } from 'vitest'
import { generateCallbackToken } from './generate-callback-token.js'

beforeAll(() => {
  process.env.WORKFLOW_CALLBACK_SECRET = 'test-secret-for-unit-tests'
})

const sampleActions = ['upload:read', 'receipt:write']

const sampleParams = {
  runUuid: '550e8400-e29b-41d4-a716-446655440000',
  runCreatedAt: '2026-04-11T10:00:00.000Z',
  scope: 'upload:abc123',
  actions: sampleActions,
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

  it('should produce different tokens for different actions', () => {
    const a = generateCallbackToken(sampleParams)
    const b = generateCallbackToken({ ...sampleParams, actions: ['expense:write', 'workflow:read'] })
    expect(a).not.toBe(b)
  })

  it('should produce same token regardless of actions order (deterministic)', () => {
    const a = generateCallbackToken({ ...sampleParams, actions: ['upload:read', 'receipt:write'] })
    const b = generateCallbackToken({ ...sampleParams, actions: ['receipt:write', 'upload:read'] })
    expect(a).toBe(b)
  })

  it('should throw if scope is missing', () => {
    expect(() => generateCallbackToken({ runUuid: 'x', runCreatedAt: 'y', actions: sampleActions }))
      .toThrow('scope and actions are required')
  })

  it('should throw if actions is missing', () => {
    expect(() => generateCallbackToken({ runUuid: 'x', runCreatedAt: 'y', scope: 'upload:abc' }))
      .toThrow('scope and actions are required')
  })

  it('should throw if actions is empty', () => {
    expect(() => generateCallbackToken({ ...sampleParams, actions: [] }))
      .toThrow('scope and actions are required')
  })

  it('should handle scope with colons (e.g. receipt:123)', () => {
    const token = generateCallbackToken({ ...sampleParams, scope: 'receipt:123' })
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })
})
