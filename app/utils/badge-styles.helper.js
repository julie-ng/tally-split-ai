function statusBadgeColor(status) {
  if (status === 'completed') return 'info'
  if (status === 'uploaded') return 'info'
  if (status === 'failed') return 'error'
  if (status === 'initialized') return 'neutral'
  return 'neutral'
}

function statusBadgeVariant(status) {
  if (status === 'completed') return 'solid'
  if (status === 'uploaded') return 'soft'
  if (status === 'failed') return 'soft'
  if (status === 'initialized') return 'outline'
  return 'soft'
}

export const badgeStyleHelpers = {
  statusBadgeColor,
  statusBadgeVariant
}
