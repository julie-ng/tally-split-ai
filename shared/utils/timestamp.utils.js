function toShortDatetime (timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function toShortDate (timestamp) {
  if (timestamp === null) {
    return '-'
  }
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toISODate (timestamp) {
  if (!timestamp) {
    return '-'
  }
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toGermanISODate (timestamp) {
  if (!timestamp) {
    return '-'
  }
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${day}.${month}.${year}`
}

// Thresholds (in seconds) → the RelativeTimeFormat unit to divide by. Ordered
// largest-first; the first threshold the elapsed time meets wins.
const RELATIVE_UNITS = [
  { limit: 60, unit: 'second', div: 1 },
  { limit: 3600, unit: 'minute', div: 60 },
  { limit: 86400, unit: 'hour', div: 3600 },
  { limit: 604800, unit: 'day', div: 86400 },
  { limit: 2629800, unit: 'week', div: 604800 }, // ~1 month
  { limit: 31557600, unit: 'month', div: 2629800 }, // ~1 year
  { limit: Infinity, unit: 'year', div: 31557600 },
]

/**
 * Relative time from now, e.g. "2 days ago", "in 3 hours", "just now".
 * Uses the native Intl.RelativeTimeFormat (no dependency). Past = negative,
 * future = positive, matching Intl's sign convention.
 *
 * @param {string|number|Date} timestamp
 * @param {Date} [now] - reference point (injectable for tests)
 * @returns {string}
 */
function toRelative (timestamp, now = new Date()) {
  if (!timestamp) {
    return '-'
  }
  const then = new Date(timestamp).getTime()
  const diffSeconds = (then - now.getTime()) / 1000
  const abs = Math.abs(diffSeconds)

  if (abs < 45) {
    return 'just now'
  }

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const { unit, div } = RELATIVE_UNITS.find(u => abs < u.limit)
  return rtf.format(Math.round(diffSeconds / div), unit)
}

export const timestampUtils = {
  toShortDate,
  toShortDatetime,
  toISODate,
  toGermanISODate,
  toRelative,
}
