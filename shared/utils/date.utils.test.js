import { describe, it, expect } from 'vitest'
import { dateUtils } from './date.utils.js'

describe('formatDate()', () => {
  it('should format date in shortened format', () => {
    const date = new Date('2025-12-07T11:39:19+01:00')
    const formatted = dateUtils.formatDate(date)

    expect(formatted).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2} [A-Z]+[+-]?\d*$/)
    expect(formatted).toContain('07')
    expect(formatted).toContain('Dec')
    expect(formatted).toContain('2025')
  })

  it('should pad single-digit days with zero', () => {
    const date = new Date('2025-01-05T10:30:00')
    const formatted = dateUtils.formatDate(date)

    expect(formatted).toMatch(/^05 /)
  })

  it('should pad single-digit hours with zero', () => {
    const date = new Date('2025-12-07T09:05:00')
    const formatted = dateUtils.formatDate(date)

    expect(formatted).toMatch(/09:05/)
  })

  it('should handle different months', () => {
    const jan = new Date('2025-01-15T12:00:00')
    const jun = new Date('2025-06-20T12:00:00')
    const dec = new Date('2025-12-25T12:00:00')

    expect(dateUtils.formatDate(jan)).toContain('Jan')
    expect(dateUtils.formatDate(jun)).toContain('Jun')
    expect(dateUtils.formatDate(dec)).toContain('Dec')
  })

  it('should include timezone abbreviation', () => {
    const date = new Date('2025-12-07T11:39:19')
    const formatted = dateUtils.formatDate(date)

    // Timezone should be at the end (e.g., PST, GMT+1, EST)
    expect(formatted).toMatch(/[A-Z]+[+-]?\d*$/)
  })
})

describe('formatISODate()', () => {
  it('should format ISO date string to short format', () => {
    const result = dateUtils.formatISODate('2025-11-08')
    expect(result).toBe('08 Nov 2025')
  })

  it('should pad single-digit days with zero', () => {
    const result = dateUtils.formatISODate('2025-01-05')
    expect(result).toBe('05 Jan 2025')
  })

  it('should handle different months', () => {
    expect(dateUtils.formatISODate('2025-01-15')).toBe('15 Jan 2025')
    expect(dateUtils.formatISODate('2025-06-20')).toBe('20 Jun 2025')
    expect(dateUtils.formatISODate('2025-12-25')).toBe('25 Dec 2025')
  })

  it('should handle year boundaries', () => {
    expect(dateUtils.formatISODate('2024-12-31')).toBe('31 Dec 2024')
    expect(dateUtils.formatISODate('2025-01-01')).toBe('01 Jan 2025')
  })
})

describe('timeWithoutSeconds()', () => {
  it('should remove seconds from time string', () => {
    const result = dateUtils.timeWithoutSeconds('11:59:34')
    expect(result).toBe('11:59')
  })

  it('should handle time without seconds', () => {
    const result = dateUtils.timeWithoutSeconds('11:59')
    expect(result).toBe('11:59')
  })

  it('should handle single-digit hours and minutes', () => {
    const result = dateUtils.timeWithoutSeconds('09:05:00')
    expect(result).toBe('09:05')
  })

  it('should handle midnight', () => {
    const result = dateUtils.timeWithoutSeconds('00:00:00')
    expect(result).toBe('00:00')
  })

  it('should handle noon', () => {
    const result = dateUtils.timeWithoutSeconds('12:00:00')
    expect(result).toBe('12:00')
  })
})
