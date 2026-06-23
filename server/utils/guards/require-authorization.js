import { eq } from 'drizzle-orm'
import { authzPermissions } from '#server/utils/authz-permissions.utils.js'

const {
  checkTaskUploadScope,
  checkTaskReceiptScope,
  checkTaskExpenseScope,
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
 * @param {string} [resource.expenseId] - Expense id to verify
 */
export async function requireAuthorization (event, { uploadId, receiptId, expenseId } = {}) {
  const db = useDB()

  const isUserRequest = !!event.context.userId
  const isTaskRequest = !!event.context.workflowRun

  if (!isUserRequest && !isTaskRequest) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (isUserRequest) {
    await authorizeUser(db, event, { householdId: event.context.householdId, uploadId, receiptId, expenseId })
  }
  else {
    await authorizeTask(db, event, { workflowRun: event.context.workflowRun, taskId: event.context.taskId, uploadId, receiptId, expenseId })
  }
}

async function authorizeUser (db, event, { householdId, uploadId, receiptId, expenseId }) {
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

  if (expenseId) {
    const [expense] = await db
      .select({ householdId: schema.expenses.householdId })
      .from(schema.expenses)
      .where(eq(schema.expenses.id, expenseId))
      .limit(1)

    if (!expense?.householdId || expense.householdId !== householdId) {
      logSecurityEvent(event, 'warn', { householdId, expenseId, reason: 'expense_not_household_member' }, 'Authorization denied')
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

async function authorizeTask (db, event, { workflowRun, taskId, uploadId, receiptId, expenseId }) {
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

  if (expenseId) {
    const linkedReceiptId = upload?.receiptId

    // Derive expenseId from expenses table (canonical direction: expenses.receiptId → receipts.id)
    let receiptExpenseId = null
    let expenseHouseholdId = null
    if (linkedReceiptId) {
      const [existingExpense] = await db
        .select({ id: schema.expenses.id })
        .from(schema.expenses)
        .where(eq(schema.expenses.receiptId, linkedReceiptId))
        .limit(1)

      receiptExpenseId = existingExpense?.id ?? null

      // For first-time linking, read the expense's own householdId column
      if (!receiptExpenseId) {
        const [expense] = await db
          .select({ householdId: schema.expenses.householdId })
          .from(schema.expenses)
          .where(eq(schema.expenses.id, expenseId))
          .limit(1)
        expenseHouseholdId = expense?.householdId ?? null
      }
    }

    const result = checkTaskExpenseScope(expenseId, {
      linkedReceiptId,
      receiptExpenseId,
      expenseHouseholdId,
      uploadHouseholdId: upload?.householdId,
    })
    if (!result.ok) {
      logSecurityEvent(event, 'warn', { taskId, expenseId, expected: receiptExpenseId, reason: result.reason }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }
}
