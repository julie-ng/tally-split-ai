import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { azureOcrExtract } from '#server/utils/azure-ocr.utils.js'
import { gpt4oUtils } from '#server/utils/azure-gpt4o.utils.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'adjust-split'

export const adjustSplit = task({
  id: TASK_ID,
  maxDuration: 60,
  run: async (payload) => {
    const { uploadHashId, splitId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'processing', authHeaders)

    try {
      // 1. Fetch upload for OCR and annotations data
      const upload = await api.get(`/api/uploads/${uploadHashId}?include=ocrJson,annotationsJson`)

      // 2. Skip if no annotations — nothing to adjust
      // Structure: annotationsJson = { model, usage, annotations: [...], notes }
      if (!upload.annotationsJson?.annotations?.length) {
        await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'completed', authHeaders)

        logger.log(`Skipped adjust-split for ${uploadHashId} — no annotations`)
        return { skipped: true, reason: 'no_annotations' }
      }

      // 3. Skip if no OCR data
      if (!upload.ocrJson) {
        await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'completed', authHeaders)

        logger.log(`Skipped adjust-split for ${uploadHashId} — no OCR data`)
        return { skipped: true, reason: 'no_ocr_data' }
      }

      // 4. Extract condensed OCR data for LLM consumption
      const ocrData = azureOcrExtract.extractForLlm(upload.ocrJson)
      if (!ocrData) {
        await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        logger.log(`Skipped adjust-split for ${uploadHashId} — no document fields`)
        return { skipped: true, reason: 'no_document_fields' }
      }

      // 5. Call GPT-4o-mini to analyze annotations and determine split
      const result = await gpt4oUtils.adjustSplit({
        ocrData,
        annotations: upload.annotationsJson,
      })

      logger.log(`Adjust-split result for ${uploadHashId}`, result)

      // 6. Fetch current split to compare — only write if values actually changed
      const currentSplit = await api.get(`/api/splits/${splitId}`)

      const updates = {}
      if (result.adjustedTotal != null && result.adjustedTotal !== currentSplit.splitAmount) {
        updates.splitAmount = result.adjustedTotal
      }
      if (result.paidBy && result.paidBy !== currentSplit.paidBy) {
        updates.paidBy = result.paidBy
      }

      // Always set 50/50 shares if they're currently null
      const splitAmount = updates.splitAmount ?? currentSplit.splitAmount
      if (currentSplit.userAShare === null || currentSplit.userBShare === null || updates.splitAmount !== undefined) {
        const halfAmount = Math.floor(splitAmount / 2 * 100) / 100
        updates.userAShare = halfAmount
        updates.userBShare = halfAmount
      }

      if (Object.keys(updates).length > 0) {
        const fieldConfidence = {}
        if (updates.splitAmount !== undefined) fieldConfidence.splitAmount = result.amountConfidence
        if (updates.paidBy !== undefined) fieldConfidence.paidBy = result.payerConfidence

        updates.llm = {
          confidence: result.confidence,
          reasoning: result.reasoning,
          fieldConfidence,
        }

        await api.put(`/api/splits/${splitId}`, updates)
      }

      // 7. Update workflow step status
      await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'completed', authHeaders)

      logger.log(`Adjust-split complete for ${uploadHashId}`, {
        splitId,
        originalTotal: result.originalTotal,
        adjustedTotal: result.adjustedTotal,
        paidBy: result.paidBy,
        amountConfidence: result.amountConfidence,
        payerConfidence: result.payerConfidence,
      })

      return {
        splitId,
        ...result,
      }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.FAILED })
      throw err
    }
  },
})
