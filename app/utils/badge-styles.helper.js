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
}
