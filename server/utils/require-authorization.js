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
  const db = useDB()

  const isUserRequest = !!event.context.userId
  const isTaskRequest = !!event.context.workflowRun

  if (!isUserRequest && !isTaskRequest) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (isUserRequest) {
    await authorizeUser(db, event, { userId: event.context.userId, uploadHashId, receiptId, splitId })
  }
  else {
    await authorizeTask(db, event, { workflowRun: event.context.workflowRun, taskId: event.context.taskId, uploadHashId, receiptId, splitId })
  }
}

/**
 * User AuthZ — verify resource belongs to this user.
 * Throws 404 on mismatch to avoid revealing resource existence.
 */
async function authorizeUser (db, event, { userId, uploadHashId, receiptId, splitId }) {
  if (receiptId) {
    const [receipt] = await db
      .select({ userId: schema.receipts.userId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId))
      .limit(1)

    if (!receipt || receipt.userId !== userId) {
      logSecurityEvent(event, 'warn', { userId, receiptId, reason: 'receipt_not_owned' }, 'Authorization denied')
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
      logSecurityEvent(event, 'warn', { userId, splitId, reason: 'split_not_owned' }, 'Authorization denied')
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
      logSecurityEvent(event, 'warn', { userId, uploadHashId, reason: 'upload_not_owned' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }
}

/**
 * Task AuthZ — verify resource belongs to this workflow run's upload.
 * Throws 403 on mismatch — tasks know their own scope, so no need to hide resource existence.
 */
async function authorizeTask (db, event, { workflowRun, taskId, uploadHashId, receiptId, splitId }) {
  const upload = workflowRun.upload

  if (uploadHashId) {
    if (!upload || uploadHashId !== upload.hashId) {
      logSecurityEvent(event, 'warn', { taskId, uploadHashId, expected: upload?.hashId, reason: 'upload_scope_mismatch' }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (receiptId) {
    // Check via upload (upload-scoped) or direct receipt link (receipt-scoped)
    const expectedReceiptId = upload?.receiptId || workflowRun.receiptId
    if (receiptId !== expectedReceiptId) {
      logSecurityEvent(event, 'warn', { taskId, receiptId, expected: expectedReceiptId, reason: 'receipt_scope_mismatch' }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (splitId) {
    // Verify split belongs to the workflow's receipt → split chain
    const linkedReceiptId = upload?.receiptId || workflowRun.receiptId
    if (!linkedReceiptId) {
      logSecurityEvent(event, 'warn', { taskId, splitId, reason: 'no_receipt_for_split_check' }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    const [receipt] = await db
      .select({ splitId: schema.receipts.splitId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, linkedReceiptId))
      .limit(1)

    if (!receipt || receipt.splitId !== splitId) {
      logSecurityEvent(event, 'warn', { taskId, splitId, expected: receipt?.splitId, reason: 'split_scope_mismatch' }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }
}
