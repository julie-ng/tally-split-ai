/**
 * Format a Date object into a shortened format
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (e.g., "07 Dec 2025 11:39 CEST")
 */
function formatDate(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  // Extract timezone abbreviation from toLocaleTimeString
  const timeString = date.toLocaleTimeString('en-US', {
    timeZoneName: 'short'
  });
  const timezone = timeString.split(' ').pop();

  return `${day} ${month} ${year} ${hours}:${minutes} ${timezone}`;
}

/**
 * Format an ISO date string into a short date format
 * @param {string} isoDate - ISO date string (e.g., "2025-11-08")
 * @returns {string} - Formatted date string (e.g., "08 Nov 2025")
 */
function formatISODate(isoDate) {
  const date = new Date(isoDate)
  const day = date.getDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()

  return `${day} ${month} ${year}`
}

/**
 * Remove seconds from a time string
 * @param {string} time - Time string (e.g., "11:59:34" or "11:59")
 * @returns {string} - Time string without seconds (e.g., "11:59")
 */
function timeWithoutSeconds(time) {
  const parts = time.split(':')
  return `${parts[0]}:${parts[1]}`
}

export const dateUtils = {
  formatDate,
  formatISODate,
  timeWithoutSeconds,
}
