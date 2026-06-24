import { CalendarDate, Time, toCalendarDateTime, toZoned } from '@internationalized/date'

/**
 * All expense dates are interpreted in Germany's timezone. This is a POC-wide
 * assumption (receipts are always EUR / Germany) — there is no per-user
 * timezone. `expenses.date` is stored as `timestamptz` (UTC); these helpers are
 * the ONLY sanctioned path between a Berlin wall-clock date/time and that UTC
 * instant. Do NOT build timestamps with `new Date('2025-11-05')` elsewhere —
 * that parses as UTC midnight and silently shifts the day. DST-aware via
 * @internationalized/date (Berlin is UTC+1 in winter, UTC+2 in summer).
 */
export const EXPENSE_TIMEZONE = 'Europe/Berlin'

/**
 * Combine a calendar date and an optional time, interpreted as Berlin
 * wall-clock, into a UTC ISO instant for storage in `expenses.date`.
 *
 * Time is optional: when omitted, defaults to midnight (00:00) — a deliberate,
 * legible "this was manually entered / no real time" sentinel, NOT a fabricated
 * plausible time.
 *
 * @param {CalendarDate|{year:number,month:number,day:number}} calendarDate
 * @param {Time|{hour:number,minute:number,second?:number}|null} [time]
 * @returns {string} UTC ISO-8601 string (e.g. "2025-07-04T22:00:00.000Z")
 */
export function toUtcInstant (calendarDate, time = null) {
  const cd = calendarDate instanceof CalendarDate
    ? calendarDate
    : new CalendarDate(calendarDate.year, calendarDate.month, calendarDate.day)

  let t
  if (time == null) {
    t = new Time(0, 0, 0) // midnight sentinel
  }
  else if (time instanceof Time) {
    t = time
  }
  else {
    t = new Time(time.hour ?? 0, time.minute ?? 0, time.second ?? 0)
  }

  return toZoned(toCalendarDateTime(cd, t), EXPENSE_TIMEZONE).toDate().toISOString()
}

/**
 * Build a UTC instant from a receipt's separate text date + time fields, for
 * the create-expense task copying a receipt date onto the expense.
 *
 * receipt.date is OCR-extracted text ("2025-11-07"); receipt.time is text
 * ("17:45:00") or null. Both are untrusted — if the date doesn't parse as a
 * valid YYYY-MM-DD, returns null (don't propagate OCR garbage into a validated
 * timestamptz). A missing/invalid time falls back to midnight (the same
 * sentinel as manual entry).
 *
 * @param {string|null} dateStr - ISO date "YYYY-MM-DD"
 * @param {string|null} [timeStr] - ISO time "HH:MM:SS" or "HH:MM"
 * @returns {string|null} UTC ISO instant, or null if the date is unusable
 */
export function fromReceiptDateTime (dateStr, timeStr = null) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr ?? '')
  if (!dateMatch) {
    return null
  }
  const [, y, m, d] = dateMatch
  const calendarDate = new CalendarDate(Number(y), Number(m), Number(d))

  let time = null
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr ?? '')
  if (timeMatch) {
    const [, hh, mm, ss] = timeMatch
    time = new Time(Number(hh), Number(mm), ss ? Number(ss) : 0)
  }

  return toUtcInstant(calendarDate, time)
}

/**
 * Format a stored UTC instant as the Berlin calendar day, "YYYY-MM-DD".
 * Use for sorting/grouping keys and machine-readable `datetime` attributes.
 *
 * @param {string|Date|null} utcInstant
 * @returns {string|null} e.g. "2025-07-05", or null if input is empty
 */
export function toBerlinISODate (utcInstant) {
  if (!utcInstant) {
    return null
  }
  // en-CA renders as YYYY-MM-DD; timeZone resolves the Berlin calendar day.
  return new Date(utcInstant).toLocaleDateString('en-CA', { timeZone: EXPENSE_TIMEZONE })
}

/**
 * Format a stored UTC instant for German display, "DD.MM.YYYY".
 * @param {string|Date|null} utcInstant
 * @returns {string|null} e.g. "05.07.2025", or null if input is empty
 */
export function toBerlinDisplayDate (utcInstant) {
  if (!utcInstant) {
    return null
  }
  return new Date(utcInstant).toLocaleDateString('de-DE', {
    timeZone: EXPENSE_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
