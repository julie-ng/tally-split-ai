import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'create-split'

export const createSplit = task({
  id: TASK_ID,
  maxDuration: 10,
  run: async (payload) => {
    const { receiptId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { splitStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.SPLIT, 'processing', authHeaders)

    try {
      // 1. Fetch receipt to get total via API
      const receipt = await api.get(`/api/receipts/${receiptId}`)

      // 2. Skip if no total available
      if (receipt.total === null || receipt.total === undefined) {
        await updateWorkflowStatus(authHeaders, { splitStatus: WORKFLOW_STEP_STATUS.COMPLETED })

        logger.log(`Skipped split creation for receipt ${receiptId} — no total`)
        return { splitId: null, skipped: true }
      }

      // 3. Create split via API
      const splitResult = await api.post('/api/splits', {
        receiptId,
        splitAmount: receipt.total,
        paidBy: null,
        isSettled: false,
      })

      const splitId = splitResult.created.id

      // 4. Link split to receipt via API
      await api.put(`/api/receipts/${receiptId}`, { splitId })

      // 5. Update workflow step status
      await updateWorkflowStatus(authHeaders, { splitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.SPLIT, 'completed', authHeaders)

      logger.log(`Split created for receipt ${receiptId}`, { splitId, amount: receipt.total })

      return { splitId, splitAmount: receipt.total }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, { splitStatus: WORKFLOW_STEP_STATUS.FAILED })
      throw err
    }
  },
})
