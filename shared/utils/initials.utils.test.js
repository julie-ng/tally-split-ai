import { describe, it, expect } from 'vitest'
import { deriveInitials } from './initials.utils.js'

describe('deriveInitials', () => {
  it('returns first letter of first and last token', () => {
    expect(deriveInitials('Michael Mustermann')).toBe('MM')
  })

  it('uppercases lowercase input', () => {
    expect(deriveInitials('jane doe')).toBe('JD')
  })

  it('uses first + LAST token for three or more (skips middle names)', () => {
    expect(deriveInitials('Anna Maria Schmidt')).toBe('AS')
    expect(deriveInitials('John Michael Adams')).toBe('JA')
  })

  it('handles single-token names (GitHub login style) — first letter only', () => {
    expect(deriveInitials('octocat')).toBe('O')
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
