import { requireAuthentication } from './guards/require-authentication.js'
import { requireAuthorization } from './guards/require-authorization.js'
import { requireWorkflowAuth } from './guards/require-workflow-auth.js'
import { requireTaskPermission } from './guards/require-task-permission.js'
import { requireIdParam } from './guards/require-id-param.js'
import { requireLocalDev } from './guards/require-local-dev.js'

export const guards = {
  requireAuthentication,
  requireAuthorization,
  requireWorkflowAuth,
  requireTaskPermission,
  requireIdParam,
  requireLocalDev,
}
