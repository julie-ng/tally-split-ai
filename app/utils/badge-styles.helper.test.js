import { describe, it, expect } from 'vitest'
import { badgeStyleHelpers } from './badge-styles.helper.js'

describe('badgeStyleHelpers.statusBadgeColor', () => {
  it('should return "info" for completed', () => {
    expect(badgeStyleHelpers.statusBadgeColor('completed')).toBe('info')
  })

  it('should return "success" for uploaded', () => {
    expect(badgeStyleHelpers.statusBadgeColor('uploaded')).toBe('success')
  })

  it('should return "error" for failed', () => {
    expect(badgeStyleHelpers.statusBadgeColor('failed')).toBe('error')
  })

  it('should return "warning" for initialized', () => {
    expect(badgeStyleHelpers.statusBadgeColor('initialized')).toBe('warning')
  })

  it('should return "neutral" for unknown status', () => {
    expect(badgeStyleHelpers.statusBadgeColor('unknown')).toBe('neutral')
  })
})

describe('badgeStyleHelpers.statusBadgeVariant', () => {
  it('should return "outline" for completed', () => {
    expect(badgeStyleHelpers.statusBadgeVariant('completed')).toBe('outline')
  })

  it('should return "outline" for uploaded', () => {
    expect(badgeStyleHelpers.statusBadgeVariant('uploaded')).toBe('outline')
  })

  it('should return "subtle" for failed', () => {
    expect(badgeStyleHelpers.statusBadgeVariant('failed')).toBe('subtle')
  })

  it('should return "subtle" for initialized', () => {
    expect(badgeStyleHelpers.statusBadgeVariant('initialized')).toBe('subtle')
  })

  it('should return "soft" for unknown status', () => {
    expect(badgeStyleHelpers.statusBadgeVariant('unknown')).toBe('soft')
  })
})

describe('badgeStyleHelpers.analysisBadgeColor', () => {
  it('should return "info" for analyzed', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('analyzed')).toBe('info')
  })

  it('should return "error" for error', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('error')).toBe('error')
  })

  it('should return "warning" for inprogress', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('inprogress')).toBe('warning')
  })

  it('should return "warning" for queued', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('queued')).toBe('warning')
  })

  it('should return "neutral" for unknown status', () => {
    expect(badgeStyleHelpers.analysisBadgeColor('unknown')).toBe('neutral')
  })
})

describe('badgeStyleHelpers.analysisBadgeVariant', () => {
  it('should return "subtle" for error', () => {
    expect(badgeStyleHelpers.analysisBadgeVariant('error')).toBe('subtle')
  })

  it('should return "subtle" for inprogress', () => {
    expect(badgeStyleHelpers.analysisBadgeVariant('inprogress')).toBe('subtle')
  })

  it('should return "subtle" for queued', () => {
    expect(badgeStyleHelpers.analysisBadgeVariant('queued')).toBe('subtle')
  })

  it('should return "subtle" for analyzed', () => {
    expect(badgeStyleHelpers.analysisBadgeVariant('analyzed')).toBe('subtle')
  })
})
