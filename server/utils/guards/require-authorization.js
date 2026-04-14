import { eq } from 'drizzle-orm'
import { authzPermissions } from '../authz-permissions.utils.js'

const {
  checkUserOwnership,
  checkTaskUploadScope,
  checkTaskReceiptScope,
  checkTaskSplitScope,
} = authzPermissions

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

async function authorizeUser (db, event, { userId, uploadHashId, receiptId, splitId }) {
  if (receiptId) {
    const [receipt] = await db
      .select({ userId: schema.receipts.userId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId))
      .limit(1)

    const result = checkUserOwnership(receipt?.userId, userId)
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { userId, receiptId, reason: `receipt_${result.reason}` }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  if (splitId) {
    const [split] = await db
      .select({ userId: schema.splits.userId })
      .from(schema.splits)
      .where(eq(schema.splits.id, splitId))
      .limit(1)

    const result = checkUserOwnership(split?.userId, userId)
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { userId, splitId, reason: `split_${result.reason}` }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  if (uploadHashId) {
    const [upload] = await db
      .select({ userId: schema.uploads.userId })
      .from(schema.uploads)
      .where(eq(schema.uploads.hashId, uploadHashId))
      .limit(1)

    const result = checkUserOwnership(upload?.userId, userId)
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { userId, uploadHashId, reason: `upload_${result.reason}` }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }
}

async function authorizeTask (db, event, { workflowRun, taskId, uploadHashId, receiptId, splitId }) {
  const upload = workflowRun.upload

  if (uploadHashId) {
    const result = checkTaskUploadScope(uploadHashId, upload?.hashId)
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, uploadHashId, expected: upload?.hashId, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (receiptId) {
    const expectedReceiptId = upload?.receiptId || workflowRun.receiptId

    let receiptUserId = null
    if (!expectedReceiptId) {
      const [receipt] = await db
        .select({ userId: schema.receipts.userId })
        .from(schema.receipts)
        .where(eq(schema.receipts.id, receiptId))
        .limit(1)
      receiptUserId = receipt?.userId
    }

    const result = checkTaskReceiptScope(receiptId, {
      expectedReceiptId,
      receiptUserId,
      uploadUserId: upload?.userId,
    })
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, receiptId, expected: expectedReceiptId, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (splitId) {
    const linkedReceiptId = upload?.receiptId || workflowRun.receiptId

    let receiptSplitId = null
    let splitUserId = null
    if (linkedReceiptId) {
      const [receipt] = await db
        .select({ splitId: schema.receipts.splitId })
        .from(schema.receipts)
        .where(eq(schema.receipts.id, linkedReceiptId))
        .limit(1)

      if (!receipt) {
        logSecurityEvent(event, 'warn', { taskId, splitId, reason: 'receipt_not_found_for_split_check' }, 'Authorization denied')
        throw createError({ statusCode: 403, message: 'Forbidden' })
      }

      receiptSplitId = receipt.splitId

      if (!receiptSplitId) {
        const [split] = await db
          .select({ userId: schema.splits.userId })
          .from(schema.splits)
          .where(eq(schema.splits.id, splitId))
          .limit(1)
        splitUserId = split?.userId
      }
    }

    const result = checkTaskSplitScope(splitId, {
      linkedReceiptId,
      receiptSplitId,
      splitUserId,
      uploadUserId: upload?.userId,
    })
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, splitId, expected: receiptSplitId, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }
}
