import { requireAuthentication } from './guards/require-authentication.js'
import { requireAuthorization } from './guards/require-authorization.js'
import { requireWorkflowAuth } from './guards/require-workflow-auth.js'
import { requireTaskPermission } from './guards/require-task-permission.js'
import { requireHashIdParam } from './guards/require-hash-id-param.js'
import { requireIdParam } from './guards/require-id-param.js'
import { requireUuidParam } from './guards/require-uuid-param.js'
import { requireLocalDev } from './guards/require-local-dev.js'

export const guards = {
  requireAuthentication,
  requireAuthorization,
  requireWorkflowAuth,
  requireTaskPermission,
  requireHashIdParam,
  requireIdParam,
  requireUuidParam,
  requireLocalDev,
}
