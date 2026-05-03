import { describe, it, expect, vi, afterEach } from 'vitest'
import { hasKeys } from './object.utils.js'

describe('hasKeys', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true for object with keys', () => {
    expect(hasKeys({ a: 1 })).toBe(true)
  })

  it('returns false for empty object', () => {
    expect(hasKeys({})).toBe(false)
  })

  it('returns false and warns for null', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(hasKeys(null)).toBe(false)
    expect(warn).toHaveBeenCalled()
  })

  it('returns false and warns for undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(hasKeys(undefined)).toBe(false)
    expect(warn).toHaveBeenCalled()
  })
})
