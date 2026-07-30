/**
 * Restrict an endpoint to HUMAN callers — task principals are rejected.
 * Call after requireAuthentication(), which establishes the principal.
 *
 * IMPORTANT
 * - Use for operations human-driven BY DESIGN (batch mutations across many
 *   rows), not merely human-driven today.
 * - Defence in depth, not the only defence: `requireWorkflowAuth` never sets
 *   `householdId`, so a task hitting a household-scoped batch endpoint already
 *   matches zero rows. This makes the intent explicit instead of emergent.
 *
 * @param {H3Event} event
 */
export function requireHumanPrincipal (event) {
  if (event.context.userId) {
    return
  }

  logSecurityEvent(event, 'warn', {
    taskId: event.context.taskId,
    principal: event.context.securityPrincipal,
    reason: 'task_principal_on_human_only_endpoint',
  }, 'Human-only endpoint denied to task principal')

  throw createError({ statusCode: 403, message: 'Forbidden' })
}
