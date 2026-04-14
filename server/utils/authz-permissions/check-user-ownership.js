/**
 * Check if a user owns a resource.
 * @param {string|null} resourceUserId - userId on the resource record
 * @param {string} expectedUserId - authenticated user's ID
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkUserOwnership (resourceUserId, expectedUserId) {
  if (!resourceUserId || resourceUserId !== expectedUserId) {
    return { ok: false, reason: 'not_owned' }
  }
  return { ok: true }
}
