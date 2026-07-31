import { describe, it, expect } from 'vitest'
import { CalendarDate, Time } from '@internationalized/date'
import { toUtcInstant, fromReceiptDate, toBerlinISODate, toBerlinDisplayDate } from './expense-date.utils.js'

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

describe('fromReceiptDate', () => {
  it('returns Berlin midnight for a summer date (UTC+2)', () => {
    expect(fromReceiptDate('2025-07-05')).toBe('2025-07-04T22:00:00.000Z')
  })

  it('returns Berlin midnight for a winter date (UTC+1)', () => {
    expect(fromReceiptDate('2025-01-05')).toBe('2025-01-04T23:00:00.000Z')
  })

  // DELIBERATE: an expense has a DATE, not a time. receipt.time must never be
  // copied onto the expense — all-midnight is the signal that we don't track
  // time here. Asserted so the time argument can't quietly come back.
  it('ignores any extra argument — receipt time is never copied', () => {
    expect(fromReceiptDate('2025-07-05', '17:45:00'))
      .toBe(fromReceiptDate('2025-07-05'))
  })

  it('returns null for an unusable / non-ISO date (no OCR garbage propagated)', () => {
    expect(fromReceiptDate('07.11.2025')).toBeNull() // German format, not ISO
    expect(fromReceiptDate('not a date')).toBeNull()
    expect(fromReceiptDate(null)).toBeNull()
    expect(fromReceiptDate('')).toBeNull()
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
