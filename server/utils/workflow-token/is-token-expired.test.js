import { describe, it, expect } from 'vitest'
import { isTokenExpired } from './is-token-expired.js'

describe('isTokenExpired', () => {
  it('should not be expired for a recent createdAt', () => {
    const createdAt = new Date()
    const { expired } = isTokenExpired(createdAt, 15)
    expect(expired).toBe(false)
  })

  it('should be expired for a createdAt older than expiry window', () => {
    const createdAt = new Date(Date.now() - 20 * 60 * 1000)
    const { expired } = isTokenExpired(createdAt, 15)
    expect(expired).toBe(true)
  })

  it('should return correct expiredAt timestamp', () => {
    const createdAt = new Date('2026-04-11T10:00:00.000Z')
    const { expiredAt } = isTokenExpired(createdAt, 15)
    expect(expiredAt).toEqual(new Date('2026-04-11T10:15:00.000Z'))
  })

  it('should use custom expiry minutes', () => {
    const createdAt = new Date(Date.now() - 5 * 60 * 1000)
    expect(isTokenExpired(createdAt, 10).expired).toBe(false)
    expect(isTokenExpired(createdAt, 3).expired).toBe(true)
  })

  it('should treat 0 minutes as immediately expired — falls back to default 15', () => {
    const createdAt = new Date(Date.now() - 1000)
    const { expired } = isTokenExpired(createdAt, 0)
    expect(expired).toBe(false)
  })

  it('should fall back to 15 minutes for NaN expiry', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 1000)
    const { expired } = isTokenExpired(createdAt, NaN)
    expect(expired).toBe(false)
  })

  it('should fall back to 15 minutes for negative expiry', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 1000)
    const { expired } = isTokenExpired(createdAt, -5)
    expect(expired).toBe(false)
  })
})
