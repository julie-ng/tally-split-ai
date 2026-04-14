import { requireAuthentication } from './guards/require-authentication.js'
import { requireAuthorization } from './guards/require-authorization.js'
import { requireWorkflowAuth } from './guards/require-workflow-auth.js'
import { requireTaskPermission } from './guards/require-task-permission.js'
import { requireHashIdParam } from './guards/require-hash-id-param.js'
import { requireIdParam } from './guards/require-id-param.js'
import { requireUploadByHashId } from './guards/require-upload-by-hash-id.js'
import { requireUserId } from './guards/require-user-id.js'
import { requireLocalDev } from './guards/require-local-dev.js'

export const guards = {
  requireAuthentication,
  requireAuthorization,
  requireWorkflowAuth,
  requireTaskPermission,
  requireHashIdParam,
  requireIdParam,
  requireUploadByHashId,
  requireUserId,
  requireLocalDev,
}
