/**
 * Format bytes into a human-readable string
 * @param {number} bytes - The number of bytes
 * @returns {string} - Formatted string (e.g., "452 KB", "1.5 MB")
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;

  if (bytes < k) {
    return `${bytes} Bytes`;
  } else if (bytes < k * k) {
    return `${Math.round(bytes / k)} KB`;
  } else {
    const mb = (bytes / (k * k)).toFixed(1);
    return `${parseFloat(mb)} MB`;
  }
}
