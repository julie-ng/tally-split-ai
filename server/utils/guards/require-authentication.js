import { requireWorkflowAuth } from './require-workflow-auth.js'

export async function requireAuthentication (event) {
  const hasWorkflowHeaders = getHeader(event, 'authorization')?.startsWith('Bearer ')
    && getHeader(event, 'x-workflow-run-uuid')

  if (hasWorkflowHeaders) {
    const workflowAuthed = await requireWorkflowAuth(event)
    if (workflowAuthed) return

    logSecurityEvent(event, 'warn', { reason: 'workflow_auth_failed' }, 'Authentication failed')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const userId = config.public.environment === 'development'
    ? config.public.demoUserId
    : null

  if (userId) {
    event.context.userId = userId
    event.context.securityPrincipal = `user:${userId}`
    return
  }

  logSecurityEvent(event, 'warn', { reason: 'no_credentials' }, 'Authentication failed')

  throw createError({
    statusCode: 401,
    message: 'Unauthorized',
  })
}
