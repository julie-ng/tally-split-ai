function statusBadgeColor(status) {
  if (status === 'completed') return 'info'
  if (status === 'uploaded') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'initialized') return 'warning'
  return 'neutral'
}

function statusBadgeVariant(status) {
  if (status === 'completed') return 'outline'
  if (status === 'uploaded') return 'outline'
  if (status === 'failed') return 'subtle'
  if (status === 'initialized') return 'subtle'
  return 'soft'
}

export const badgeStyleHelpers = {
  statusBadgeColor,
  statusBadgeVariant
}
