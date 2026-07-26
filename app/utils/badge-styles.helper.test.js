import { describe, it, expect } from 'vitest'
import { badgeStyleHelpers } from './badge-styles.helper.js'

describe('badgeStyleHelpers.analysisBadgeColor', () => {
  it('should return "info" for analyzed', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('analyzed')).toBe('info')
  })

  it('should return "neutral" for unknown status', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('unknown')).toBe('neutral')
  })
})

describe('badgeStyleHelpers.analysisBadgeVariant', () => {
  it('should return "subtle" for analyzed', () => {
    expect(badgeStyleHelpers.analysisBadgeVariant('analyzed')).toBe('subtle')
  })
})
