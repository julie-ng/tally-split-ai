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

export const dateUtils = {
  formatDate,
}
