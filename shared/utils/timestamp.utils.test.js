import { describe, it, expect } from 'vitest'
import { timestampUtils } from './timestamp.utils.js'

describe('toShortDatetime()', () => {
  it('should format timestamp with date and time', () => {
    const timestamp = '2025-12-07T11:39:19+01:00'
    const formatted = timestampUtils.toShortDatetime(timestamp)

    expect(formatted).toContain('07')
    expect(formatted).toContain('Dec')
    expect(formatted).toContain('2025')
    expect(formatted).toContain('11:39')
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
