import crypto from 'node:crypto'
import { serializeActions } from '../../../shared/config/task-permissions.js'

function getSalt () {
  const salt = process.env.WORKFLOW_CALLBACK_SALT
  if (!salt) {
    throw new Error('WORKFLOW_CALLBACK_SALT environment variable is not set')
  }
  return salt
}

export function generateCallbackToken ({ runUuid, runCreatedAt, scope, actions }) {
  if (!scope || !actions?.length) {
    throw new Error('scope and actions are required for token generation')
  }
  const input = `${runUuid}|${runCreatedAt}|${scope}|${serializeActions(actions)}`
  return crypto.createHmac('sha256', getSalt()).update(input).digest('hex')
}
