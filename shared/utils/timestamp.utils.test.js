import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { timestampUtils } from './timestamp.utils.js'

describe('timestampUtils', () => {
  let originalTZ

  beforeEach(() => {
    // Save original timezone and set to Europe/Berlin for consistent tests
    originalTZ = process.env.TZ
    process.env.TZ = 'Europe/Berlin'
  })

  afterEach(() => {
    // Restore original timezone
    process.env.TZ = originalTZ
  })

  describe('toShortDatetime()', () => {
    it('should format timestamp with date and time', () => {
      const timestamp = '2025-12-07T11:39:19+01:00'
      const formatted = timestampUtils.toShortDatetime(timestamp)

      expect(formatted).toContain('07')
      expect(formatted).toContain('Dec')
      expect(formatted).toContain('2025')
      expect(formatted).toContain('11:39')
    })

    it('should use 24-hour time, not AM/PM', () => {
      const formatted = timestampUtils.toShortDatetime('2025-12-07T18:05:00+01:00')

      expect(formatted).toContain('18:05')
      expect(formatted).not.toMatch(/AM|PM/)
    })

    // en-US renders midnight as "24:00" under hour12: false unless hourCycle is
    // pinned; assert the boundary so a locale/Node change can't reintroduce it.
    it('should render midnight as 00:xx', () => {
      const formatted = timestampUtils.toShortDatetime('2025-12-07T00:15:00+01:00')

      expect(formatted).toContain('00:15')
    })

    it('should return "-" for null timestamp', () => {
      const result = timestampUtils.toShortDatetime(null)
      expect(result).toBe('-')
    })

    it('should return "-" for undefined timestamp', () => {
      const result = timestampUtils.toShortDatetime(undefined)
      expect(result).toBe('-')
    })

    it('should return "-" for empty string', () => {
      const result = timestampUtils.toShortDatetime('')
      expect(result).toBe('-')
    })
  })

  describe('toShortDate()', () => {
    it('should format timestamp with date only', () => {
      const timestamp = '2025-12-07T11:39:19+01:00'
      const formatted = timestampUtils.toShortDate(timestamp)

      expect(formatted).toContain('07')
      expect(formatted).toContain('Dec')
      expect(formatted).toContain('2025')
      expect(formatted).not.toContain('11:39')
    })

    it('should return "-" for null timestamp', () => {
      const result = timestampUtils.toShortDate(null)
      expect(result).toBe('-')
    })

    it('should handle different months', () => {
      expect(timestampUtils.toShortDate('2025-01-15T12:00:00')).toContain('Jan')
      expect(timestampUtils.toShortDate('2025-06-20T12:00:00')).toContain('Jun')
      expect(timestampUtils.toShortDate('2025-12-25T12:00:00')).toContain('Dec')
    })
  })

  describe('toISODate()', () => {
    it('should format timestamp to yyyy-mm-dd format', () => {
      const timestamp = '2025-12-07T11:39:19+01:00'
      const result = timestampUtils.toISODate(timestamp)

      expect(result).toBe('2025-12-07')
    })

    it('should pad single-digit months with zero', () => {
      const timestamp = '2025-01-15T12:00:00'
      const result = timestampUtils.toISODate(timestamp)

      expect(result).toBe('2025-01-15')
    })

    it('should pad single-digit days with zero', () => {
      const timestamp = '2025-11-05T12:00:00'
      const result = timestampUtils.toISODate(timestamp)

      expect(result).toBe('2025-11-05')
    })

    it('should handle year boundaries', () => {
      expect(timestampUtils.toISODate('2024-12-31T23:59:59')).toBe('2024-12-31')
      expect(timestampUtils.toISODate('2025-01-01T00:00:00')).toBe('2025-01-01')
    })

    it('should handle leap years', () => {
      expect(timestampUtils.toISODate('2024-02-29T12:00:00')).toBe('2024-02-29')
    })

    it('should return "-" for null timestamp', () => {
      const result = timestampUtils.toISODate(null)
      expect(result).toBe('-')
    })

    it('should return "-" for undefined timestamp', () => {
      const result = timestampUtils.toISODate(undefined)
      expect(result).toBe('-')
    })

    it('should return "-" for empty string', () => {
      const result = timestampUtils.toISODate('')
      expect(result).toBe('-')
    })

    it('should handle different time zones', () => {
      const utc = timestampUtils.toISODate('2025-06-15T12:00:00Z')
      const cet = timestampUtils.toISODate('2025-06-15T14:00:00+02:00')

      expect(utc).toBe('2025-06-15')
      expect(cet).toBe('2025-06-15')
    })
  })

  describe('toGermanISODate()', () => {
    it('should format timestamp to dd.mm.yyyy format', () => {
      const timestamp = '2025-12-07T11:39:19+01:00'
      const result = timestampUtils.toGermanISODate(timestamp)

      expect(result).toBe('07.12.2025')
    })

    it('should pad single-digit months with zero', () => {
      const timestamp = '2025-01-15T12:00:00'
      const result = timestampUtils.toGermanISODate(timestamp)

      expect(result).toBe('15.01.2025')
    })

    it('should pad single-digit days with zero', () => {
      const timestamp = '2025-11-05T12:00:00'
      const result = timestampUtils.toGermanISODate(timestamp)

      expect(result).toBe('05.11.2025')
    })

    it('should handle year boundaries', () => {
      expect(timestampUtils.toGermanISODate('2024-12-31T23:59:59')).toBe('31.12.2024')
      expect(timestampUtils.toGermanISODate('2025-01-01T00:00:00')).toBe('01.01.2025')
    })

    it('should handle leap years', () => {
      expect(timestampUtils.toGermanISODate('2024-02-29T12:00:00')).toBe('29.02.2024')
    })

    it('should return "-" for null timestamp', () => {
      const result = timestampUtils.toGermanISODate(null)
      expect(result).toBe('-')
    })

    it('should return "-" for undefined timestamp', () => {
      const result = timestampUtils.toGermanISODate(undefined)
      expect(result).toBe('-')
    })

    it('should return "-" for empty string', () => {
      const result = timestampUtils.toGermanISODate('')
      expect(result).toBe('-')
    })

    it('should handle different time zones', () => {
      const utc = timestampUtils.toGermanISODate('2025-06-15T12:00:00Z')
      const cet = timestampUtils.toGermanISODate('2025-06-15T14:00:00+02:00')

      expect(utc).toBe('15.06.2025')
      expect(cet).toBe('15.06.2025')
    })
  })

  describe('toRelative', () => {
    const now = new Date('2026-07-25T12:00:00Z')

    it('should return "-" for undefined/empty', () => {
      expect(timestampUtils.toRelative(undefined, now)).toBe('-')
      expect(timestampUtils.toRelative('', now)).toBe('-')
    })

    it('should say "just now" for very recent times', () => {
      expect(timestampUtils.toRelative('2026-07-25T11:59:30Z', now)).toBe('just now')
      expect(timestampUtils.toRelative(now, now)).toBe('just now')
    })

    it('should format past times', () => {
      expect(timestampUtils.toRelative('2026-07-25T11:58:00Z', now)).toBe('2 minutes ago')
      expect(timestampUtils.toRelative('2026-07-25T09:00:00Z', now)).toBe('3 hours ago')
      expect(timestampUtils.toRelative('2026-07-23T12:00:00Z', now)).toBe('2 days ago')
      expect(timestampUtils.toRelative('2026-07-24T12:00:00Z', now)).toBe('yesterday')
    })

    it('should format future times', () => {
      expect(timestampUtils.toRelative('2026-07-25T15:00:00Z', now)).toBe('in 3 hours')
      expect(timestampUtils.toRelative('2026-07-27T12:00:00Z', now)).toBe('in 2 days')
    })
  })
})
