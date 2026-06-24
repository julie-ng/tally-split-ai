import { describe, it, expect } from 'vitest'
import { CalendarDate, Time } from '@internationalized/date'
import { toUtcInstant, fromReceiptDateTime, toBerlinISODate, toBerlinDisplayDate } from './expense-date.utils.js'

describe('toUtcInstant', () => {
  it('interprets midnight in WINTER (UTC+1) — shifts to previous day 23:00Z', () => {
    expect(toUtcInstant(new CalendarDate(2025, 1, 5), new Time(0, 0, 0)))
      .toBe('2025-01-04T23:00:00.000Z')
  })

  // The DST case — a hardcoded +01:00 offset would get this wrong.
  it('interprets midnight in SUMMER (UTC+2, DST) — shifts to previous day 22:00Z', () => {
    expect(toUtcInstant(new CalendarDate(2025, 7, 5), new Time(0, 0, 0)))
      .toBe('2025-07-04T22:00:00.000Z')
  })

  it('interprets a summer afternoon time correctly (12:00 Berlin → 10:00Z)', () => {
    expect(toUtcInstant(new CalendarDate(2025, 7, 5), new Time(12, 0, 0)))
      .toBe('2025-07-05T10:00:00.000Z')
  })

  it('defaults omitted time to midnight (the manual-entry sentinel)', () => {
    expect(toUtcInstant(new CalendarDate(2025, 7, 5)))
      .toBe(toUtcInstant(new CalendarDate(2025, 7, 5), new Time(0, 0, 0)))
  })

  it('accepts a plain { year, month, day } object', () => {
    expect(toUtcInstant({ year: 2025, month: 1, day: 5 }))
      .toBe('2025-01-04T23:00:00.000Z')
  })

  it('accepts a plain { hour, minute } object, defaulting seconds to 0', () => {
    expect(toUtcInstant({ year: 2025, month: 7, day: 5 }, { hour: 12, minute: 30 }))
      .toBe('2025-07-05T10:30:00.000Z')
  })
})

describe('fromReceiptDateTime', () => {
  it('combines receipt date + time (Berlin) into a UTC instant', () => {
    // 2025-07-05 17:45 Berlin (UTC+2) → 15:45Z
    expect(fromReceiptDateTime('2025-07-05', '17:45:00'))
      .toBe('2025-07-05T15:45:00.000Z')
  })

  it('falls back to midnight when the receipt has no time', () => {
    expect(fromReceiptDateTime('2025-07-05', null))
      .toBe('2025-07-04T22:00:00.000Z') // Berlin midnight summer
  })

  it('accepts HH:MM time without seconds', () => {
    expect(fromReceiptDateTime('2025-01-05', '08:30'))
      .toBe('2025-01-05T07:30:00.000Z') // winter UTC+1
  })

  it('returns null for an unusable / non-ISO date (no OCR garbage propagated)', () => {
    expect(fromReceiptDateTime('07.11.2025', null)).toBeNull() // German format, not ISO
    expect(fromReceiptDateTime('not a date', null)).toBeNull()
    expect(fromReceiptDateTime(null, '12:00')).toBeNull()
    expect(fromReceiptDateTime('', null)).toBeNull()
  })

  it('ignores a garbage time but keeps the valid date (→ midnight)', () => {
    expect(fromReceiptDateTime('2025-01-05', 'nonsense'))
      .toBe('2025-01-04T23:00:00.000Z')
  })
})

describe('toBerlinISODate', () => {
  it('recovers the Berlin calendar day from a winter UTC instant', () => {
    expect(toBerlinISODate('2025-01-04T23:00:00Z')).toBe('2025-01-05')
  })

  it('recovers the Berlin calendar day from a summer UTC instant', () => {
    expect(toBerlinISODate('2025-07-04T22:00:00Z')).toBe('2025-07-05')
  })

  it('round-trips: toUtcInstant → toBerlinISODate returns the original day', () => {
    const utc = toUtcInstant(new CalendarDate(2025, 7, 5), new Time(0, 0, 0))
    expect(toBerlinISODate(utc)).toBe('2025-07-05')
  })

  it('returns null for empty input', () => {
    expect(toBerlinISODate(null)).toBeNull()
    expect(toBerlinISODate(undefined)).toBeNull()
    expect(toBerlinISODate('')).toBeNull()
  })
})

describe('toBerlinDisplayDate', () => {
  it('formats as DD.MM.YYYY in Berlin time', () => {
    expect(toBerlinDisplayDate('2025-07-04T22:00:00Z')).toBe('05.07.2025')
  })

  it('returns null for empty input', () => {
    expect(toBerlinDisplayDate(null)).toBeNull()
  })
})
