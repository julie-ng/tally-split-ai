import { describe, it, expect } from 'vitest'
import { deriveInitials } from './initials.utils.js'

describe('deriveInitials', () => {
  it('returns first letter of first two tokens', () => {
    expect(deriveInitials('Michael Mustermann')).toBe('MM')
  })

  it('uppercases lowercase input', () => {
    expect(deriveInitials('jane doe')).toBe('JD')
  })

  it('handles three or more tokens by using first two', () => {
    expect(deriveInitials('Anna Maria Schmidt')).toBe('AM')
  })

  it('handles single-token names (GitHub login style)', () => {
    expect(deriveInitials('octocat')).toBe('OC')
  })

  it('handles single-character names', () => {
    expect(deriveInitials('x')).toBe('X')
  })

  it('trims surrounding whitespace', () => {
    expect(deriveInitials('  Jane Doe  ')).toBe('JD')
  })

  it('collapses multiple internal whitespace', () => {
    expect(deriveInitials('Jane    Doe')).toBe('JD')
  })

  it('returns ?? for empty string', () => {
    expect(deriveInitials('')).toBe('??')
  })

  it('returns ?? for whitespace-only', () => {
    expect(deriveInitials('   ')).toBe('??')
  })

  it('returns ?? for null', () => {
    expect(deriveInitials(null)).toBe('??')
  })

  it('returns ?? for undefined', () => {
    expect(deriveInitials(undefined)).toBe('??')
  })
})
