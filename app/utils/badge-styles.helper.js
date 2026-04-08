function statusBadgeColor (status) {
  if (status === 'completed') return 'info'
  if (status === 'uploaded') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'initialized') return 'warning'
  return 'neutral'
}

function statusBadgeVariant (status) {
  if (status === 'completed') return 'outline'
  if (status === 'uploaded') return 'outline'
  if (status === 'failed') return 'subtle'
  if (status === 'initialized') return 'subtle'
  return 'soft'
}

function analysisBadgeColor (status) {
  if (status === 'analyzed') return 'info'
  return 'neutral'
}

function analysisBadgeVariant (status) {
  if (status === 'analyzed') return 'subtle'
  return 'subtle'
}

export const badgeStyleHelpers = {
  analysisBadgeColor,
  analysisBadgeVariant,
  statusBadgeColor,
  statusBadgeVariant,
}
