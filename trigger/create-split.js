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
    await updateWorkflowStatus(authHeaders, { createSplitStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.SPLIT, 'processing', authHeaders)

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

      // 3. Create split via API with default 50/50 shares.
      // userOneId / userTwoId slots are auto-assigned by the API from the
      // receipt's household members (ordered by users.createdAt).
      const halfAmount = Math.floor(splitAmount / 2 * 100) / 100
      const splitResult = await api.post('/api/splits', {
        receiptId,
        splitAmount,
        userOneShare: halfAmount,
        userTwoShare: halfAmount,
        isSettled: false,
      })

      const splitId = splitResult.created.id

      // 4. Update workflow step status
      await updateWorkflowStatus(authHeaders, { createSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.SPLIT, 'completed', authHeaders)

      logger.log(`Split created for receipt ${receiptId}`, { splitId, splitAmount, amountSource })

      return { splitId, splitAmount, amountSource }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, {
        createSplitStatus: WORKFLOW_STEP_STATUS.FAILED,
        error: err.message,
      })
      await notifyStatus(runUuid, WORKFLOW_STEP.SPLIT, 'failed', authHeaders, err.message)
      throw err
    }
  },
})
