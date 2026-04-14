export function checkUserOwnership (resourceUserId, expectedUserId) {
  if (!resourceUserId || resourceUserId !== expectedUserId) {
    return { ok: false, reason: 'not_owned' }
  }
  return { ok: true }
}
