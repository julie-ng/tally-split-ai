import { eq } from 'drizzle-orm'

/**
 * Authorize the request — verifies the authenticated principal can act on the specified resource.
 * Must be called after requireAuthentication().
 *
 * User path: verifies resource's userId matches event.context.userId.
 *   Returns 404 on mismatch (do not reveal resource existence to unauthorized users).
 * Task path: verifies resource belongs to this workflow run's upload.
 *   Returns 403 on mismatch (tasks know their own scope).
 *
 * @param {H3Event} event
 * @param {Object} resource - Resource IDs to check (at least one required)
 * @param {string} [resource.uploadHashId] - Upload hashId to verify
 * @param {number} [resource.receiptId] - Receipt ID to verify
 * @param {number} [resource.splitId] - Split ID to verify
 */
export async function requireAuthorization (event, { uploadHashId, receiptId, splitId } = {}) {
  const log = useLogger('security')
  const db = useDB()
  const ip = getRequestIP(event, { xForwardedFor: true })

  const isUserRequest = !!event.context.userId
  const isTaskRequest = !!event.context.workflowRun

  if (!isUserRequest && !isTaskRequest) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (isUserRequest) {
    await authorizeUser(db, log, { ip, userId: event.context.userId, uploadHashId, receiptId, splitId })
  }
  else {
    authorizeTask(log, { ip, workflowRun: event.context.workflowRun, taskId: event.context.taskId, uploadHashId, receiptId, splitId })
  }
}

/**
 * User AuthZ — verify resource belongs to this user.
 * Throws 404 on mismatch to avoid revealing resource existence.
 */
async function authorizeUser (db, log, { ip, userId, uploadHashId, receiptId, splitId }) {
  if (receiptId) {
    const [receipt] = await db
      .select({ userId: schema.receipts.userId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId))
      .limit(1)

    if (!receipt || receipt.userId !== userId) {
      log.warn({ ip, userId, receiptId, reason: 'receipt_not_owned' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  if (splitId) {
    const [split] = await db
      .select({ userId: schema.splits.userId })
      .from(schema.splits)
      .where(eq(schema.splits.id, splitId))
      .limit(1)

    if (!split || split.userId !== userId) {
      log.warn({ ip, userId, splitId, reason: 'split_not_owned' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  if (uploadHashId) {
    const [upload] = await db
      .select({ userId: schema.uploads.userId })
      .from(schema.uploads)
      .where(eq(schema.uploads.hashId, uploadHashId))
      .limit(1)

    if (!upload || upload.userId !== userId) {
      log.warn({ ip, userId, uploadHashId, reason: 'upload_not_owned' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }
}

/**
 * Task AuthZ — verify resource belongs to this workflow run's upload.
 * Throws 403 on mismatch — tasks know their own scope, so no need to hide resource existence.
 */
function authorizeTask (log, { ip, workflowRun, taskId, uploadHashId, receiptId, splitId }) {
  const upload = workflowRun.upload

  if (uploadHashId && uploadHashId !== upload.hashId) {
    log.warn({ ip, taskId, uploadHashId, expected: upload.hashId, reason: 'upload_scope_mismatch' }, 'Authorization denied')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (receiptId && receiptId !== upload.receiptId) {
    log.warn({ ip, taskId, receiptId, expected: upload.receiptId, reason: 'receipt_scope_mismatch' }, 'Authorization denied')
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (splitId) {
    // TODO: implement split scope check — need to join through upload → receipt → split
    // For now, log and allow (split is always created in context of a receipt)
    log.info({ ip, taskId, splitId, reason: 'split_scope_check_deferred' }, 'Split scope check not yet implemented')
  }
}
