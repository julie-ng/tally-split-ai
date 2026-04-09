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

export const timestampUtils = {
  toShortDate,
  toShortDatetime,
  toISODate,
  toGermanISODate,
}
