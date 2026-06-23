import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { azureOcrExtract } from '#server/utils/azure-ocr.utils.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'create-split'

export const createSplit = task({
  id: TASK_ID,
  maxDuration: 10,
  run: async (payload) => {
    const { receiptId, uploadId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { createExpenseStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.EXPENSE, 'processing', authHeaders)

    try {
      // 1. Fetch receipt to get total via API
      const receipt = await api.get(`/api/receipts/${receiptId}`)

      // 2. Resolve a split amount. Prefer the receipt total; if Azure couldn't
      // detect one, sum the OCR line items; if neither is available, fall
      // back to 0 so the user always has a split row to edit.
      let splitAmount = receipt.total ?? null
      let amountSource = 'receipt_total'

      if (splitAmount == null && uploadId) {
        const upload = await api.get(`/api/uploads/${uploadId}?include=ocrJson`)
        const fields = azureOcrExtract.extractDocumentFields(upload.ocrJson)
        const lineItems = fields ? azureOcrExtract.extractFlattenedLineItems(fields) : []
        const sum = lineItems.reduce((acc, item) => acc + (item.totalPrice ?? 0), 0)
        if (sum > 0) {
          splitAmount = Math.round(sum * 100) / 100
          amountSource = 'line_items_sum'
        }
      }

      if (splitAmount == null) {
        splitAmount = 0
        amountSource = 'fallback_zero'
      }

      // 3. Create split via API. Shares are omitted — the endpoint defaults
      // them to a 50/50 split of splitAmount (single source of truth for the
      // halving logic). userOneId / userTwoId slots are auto-assigned by the
      // API from the receipt's household members (ordered by users.createdAt).
      const expenseResult = await api.post('/api/expenses', {
        receiptId,
        title: receipt.title,
        splitAmount,
        isSettled: false,
      })

      const expenseId = expenseResult.created.id

      // 4. Update workflow step status
      await updateWorkflowStatus(authHeaders, { createExpenseStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.EXPENSE, 'completed', authHeaders)

      logger.log(`Expense created for receipt ${receiptId}`, { expenseId, amountSource })

      return { expenseId, splitAmount, amountSource }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, {
        createExpenseStatus: WORKFLOW_STEP_STATUS.FAILED,
        errors: { [WORKFLOW_STEP.EXPENSE]: err.message },
      })
      await notifyStatus(runUuid, WORKFLOW_STEP.EXPENSE, 'failed', authHeaders, err.message)
      throw err
    }
  },
})
