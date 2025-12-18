function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`)

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts.join(' and ')

  const last = parts.pop()
  return parts.join(', ') + ' and ' + last
}

export default defineEventHandler((event) => {
  const uptime = Math.ceil(process.uptime())

  return {
    status: 'ok',
    message: 'Server is up and running.',
    timestamp: new Date().toISOString(),
    uptime,
    uptime_human_readable: formatUptime(uptime)
  }
})
