import { describe, it, expect } from 'vitest'
import { shortIdFromCaseDir } from './case-dir.utils.mjs'

describe('shortIdFromCaseDir', () => {
  it('extracts the short ID from a descriptive folder name', () => {
    expect(shortIdFromCaseDir('vfpmdwas-two-circles-of-three-items-last4cc')).toBe('vfpmdwas')
  })

  it('returns the input unchanged when there is no suffix', () => {
    expect(shortIdFromCaseDir('vfpmdwas')).toBe('vfpmdwas')
  })

  it('takes only the first segment when there are multiple hyphens', () => {
    expect(shortIdFromCaseDir('qngwubea-initials-inconsistent-strikethroughs')).toBe('qngwubea')
  })
})
