import { eq } from 'drizzle-orm'
import { authzPermissions } from '#server/utils/authz-permissions.utils.js'

const {
  checkTaskUploadScope,
  checkTaskReceiptScope,
  checkTaskSplitScope,
} = authzPermissions

/**
 * Authorize the request — verifies the authenticated principal can act on the specified resource.
 * Must be called after requireAuthentication().
 *
 * User path: verifies resource's householdId matches event.context.householdId.
 *   Returns 404 on mismatch (do not reveal resource existence to non-members).
 * Task path: verifies resource belongs to this workflow run's upload.
 *   Returns 403 on mismatch (tasks know their own scope).
 *
 * @param {H3Event} event
 * @param {Object} resource - Resource IDs to check (at least one required)
 * @param {string} [resource.uploadId] - Upload id to verify
 * @param {string} [resource.receiptId] - Receipt id to verify
 * @param {string} [resource.splitId] - Split id to verify
 */
export async function requireAuthorization (event, { uploadId, receiptId, splitId } = {}) {
  const db = useDB()

  const isUserRequest = !!event.context.userId
  const isTaskRequest = !!event.context.workflowRun

  if (!isUserRequest && !isTaskRequest) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (isUserRequest) {
    await authorizeUser(db, event, { householdId: event.context.householdId, uploadId, receiptId, splitId })
  }
  else {
    await authorizeTask(db, event, { workflowRun: event.context.workflowRun, taskId: event.context.taskId, uploadId, receiptId, splitId })
  }
}

async function authorizeUser (db, event, { householdId, uploadId, receiptId, splitId }) {
  if (receiptId) {
    const [receipt] = await db
      .select({ householdId: schema.receipts.householdId })
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId))
      .limit(1)

    if (!receipt?.householdId || receipt.householdId !== householdId) {
      logSecurityEvent(event, 'warn', { householdId, receiptId, reason: 'receipt_not_household_member' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  if (splitId) {
    // splits has no householdId column — derive via receipt
    const [row] = await db
      .select({ householdId: schema.receipts.householdId })
      .from(schema.splits)
      .leftJoin(schema.receipts, eq(schema.splits.receiptId, schema.receipts.id))
      .where(eq(schema.splits.id, splitId))
      .limit(1)

    if (!row?.householdId || row.householdId !== householdId) {
      logSecurityEvent(event, 'warn', { householdId, splitId, reason: 'split_not_household_member' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  if (uploadId) {
    const [upload] = await db
      .select({ householdId: schema.uploads.householdId })
      .from(schema.uploads)
      .where(eq(schema.uploads.id, uploadId))
      .limit(1)

    if (!upload?.householdId || upload.householdId !== householdId) {
      logSecurityEvent(event, 'warn', { householdId, uploadId, reason: 'upload_not_household_member' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }
}

async function authorizeTask (db, event, { workflowRun, taskId, uploadId, receiptId, splitId }) {
  const upload = workflowRun.upload

  if (uploadId) {
    const result = checkTaskUploadScope(uploadId, upload?.id)
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, uploadId, expected: upload?.id, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (receiptId) {
    const expectedReceiptId = upload?.receiptId

    // For first-time linking, we need the receipt's householdId
    let receiptHouseholdId = null
    if (!expectedReceiptId) {
      const [receipt] = await db
        .select({ householdId: schema.receipts.householdId })
        .from(schema.receipts)
        .where(eq(schema.receipts.id, receiptId))
        .limit(1)
      receiptHouseholdId = receipt?.householdId
    }

    const result = checkTaskReceiptScope(receiptId, {
      expectedReceiptId,
      receiptHouseholdId,
      uploadHouseholdId: upload?.householdId,
    })
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, receiptId, expected: expectedReceiptId, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }

  if (splitId) {
    const linkedReceiptId = upload?.receiptId

    // Derive splitId from splits table (canonical direction: splits.receiptId → receipts.id)
    let receiptSplitId = null
    let splitHouseholdId = null
    if (linkedReceiptId) {
      const [existingSplit] = await db
        .select({ id: schema.splits.id })
        .from(schema.splits)
        .where(eq(schema.splits.receiptId, linkedReceiptId))
        .limit(1)

      receiptSplitId = existingSplit?.id ?? null

      // For first-time linking, derive split's householdId via its receipt
      if (!receiptSplitId) {
        const [row] = await db
          .select({ householdId: schema.receipts.householdId })
          .from(schema.splits)
          .leftJoin(schema.receipts, eq(schema.splits.receiptId, schema.receipts.id))
          .where(eq(schema.splits.id, splitId))
          .limit(1)
        splitHouseholdId = row?.householdId ?? null
      }
    }

    const result = checkTaskSplitScope(splitId, {
      linkedReceiptId,
      receiptSplitId,
      splitHouseholdId,
      uploadHouseholdId: upload?.householdId,
    })
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, splitId, expected: receiptSplitId, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }
}
