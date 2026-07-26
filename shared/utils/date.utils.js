/**
 * Format a Date object into a shortened format
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (e.g., "07 Dec 2025 11:39 CEST")
 */
function formatDate (date) {
  const day = date.getDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  // Extract timezone abbreviation from toLocaleTimeString
  const timeString = date.toLocaleTimeString('en-US', {
    timeZoneName: 'short',
  })
  const timezone = timeString.split(' ').pop()

  return `${day} ${month} ${year} ${hours}:${minutes} ${timezone}`
}

/**
 * Format an ISO date string into a short date format
 * @param {string} isoDate - ISO date string (e.g., "2025-11-08")
 * @returns {string} - Formatted date string (e.g., "08 Nov 2025")
 */
function formatISODate (isoDate) {
  const date = new Date(isoDate)
  const day = date.getUTCDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const year = date.getUTCFullYear()

  return `${day} ${month} ${year}`
}

/**
 * Format a bare ISO date string as day + short month, no year.
 * Parses as UTC (getUTCDate / timeZone: 'UTC') so a date-only string like
 * "2025-06-28" never shifts a day across the local/Berlin offset.
 * @param {string} isoDate - ISO date string (e.g., "2025-06-28")
 * @returns {string|null} - e.g. "28 Jun", or null if input is empty
 */
function formatDayMonth (isoDate) {
  if (!isoDate) {
    return null
  }
  const date = new Date(isoDate)
  const day = date.getUTCDate()
  const month = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
  return `${day} ${month}`
}

/**
 * Remove seconds from a time string
 * @param {string} time - Time string (e.g., "11:59:34" or "11:59")
 * @returns {string} - Time string without seconds (e.g., "11:59")
 */
function timeWithoutSeconds (time) {
  const parts = time.split(':')
  return `${parts[0]}:${parts[1]}`
}

/**
 * Format a duration in seconds as a compact human string.
 * @param {number} totalSeconds - Whole seconds elapsed
 * @returns {string} - e.g. "6s" or "1m 4s"
 */
function formatDuration (totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

/**
 * Elapsed time between two timestamps, formatted (start → end).
 * Returns null if either bound is missing, so callers can `v-if` on it.
 * Clamps negatives to 0.
 *
 * Used by the workflow status cells + timeline for run/step durations. NOTE for
 * those callers: workflow_runs timestamps are plain `timestamp` (no TZ), so pass
 * a completed `end` (completedAt) — `end − start` cancels the parse offset, but a
 * live `now − start` does NOT (start misparses as local → bogus). Don't pass a
 * live `now` as `end` for those columns.
 *
 * @param {string|number|Date|null} start
 * @param {string|number|Date|null} end
 * @returns {string|null} e.g. "1m 4s", or null if start/end missing
 */
function durationBetween (start, end) {
  if (!start || !end) {
    return null
  }
  const seconds = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 1000))
  return formatDuration(seconds)
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Get the full month name from a month number
 * @param {number} month - Month number (1-12)
 * @returns {string} - Full month name (e.g., "January")
 */
function getMonthName (month) {
  return monthNames[month - 1]
}

export const dateUtils = {
  durationBetween,
  formatDate,
  formatDayMonth,
  formatDuration,
  formatISODate,
  getMonthName,
  timeWithoutSeconds,
}
