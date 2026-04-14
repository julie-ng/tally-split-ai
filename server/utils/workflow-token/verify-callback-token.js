import crypto from 'node:crypto'
import { generateCallbackToken } from './generate-callback-token.js'

export function verifyCallbackToken (token, { runUuid, runCreatedAt, scope, actions }) {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    return false
  }
  const expected = generateCallbackToken({ runUuid, runCreatedAt, scope, actions })
  return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
}
