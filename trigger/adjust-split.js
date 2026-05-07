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
    const { uploadId, splitId, runUuid, callbackToken, customInstructions } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'processing', authHeaders)

    try {
      // 1. Fetch upload for OCR and annotations data
      const upload = await api.get(`/api/uploads/${uploadId}?include=ocrJson,annotationsJson`)

      // 2. Skip if there's nothing for the LLM to act on — neither annotations
      // nor custom instructions. Running the model with empty inputs would
      // just echo the original total with low confidence.
      const hasAnnotations = !!upload.annotationsJson?.annotations?.length
      const hasCustomInstructions = !!customInstructions?.trim()
      if (!hasAnnotations && !hasCustomInstructions) {
        await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'completed', authHeaders)

        logger.log(`Skipped adjust-split for ${uploadId} — no annotations and no custom instructions`)
        return { skipped: true, reason: 'no_inputs' }
      }

      // 3. Skip if no OCR data
      if (!upload.ocrJson) {
        await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'completed', authHeaders)

        logger.log(`Skipped adjust-split for ${uploadId} — no OCR data`)
        return { skipped: true, reason: 'no_ocr_data' }
      }

      // 4. Extract condensed OCR data for LLM consumption
      const ocrData = azureOcrExtract.extractForLlm(upload.ocrJson)
      if (!ocrData) {
        await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        logger.log(`Skipped adjust-split for ${uploadId} — no document fields`)
        return { skipped: true, reason: 'no_document_fields' }
      }

      // 5. Call GPT-4o-mini to analyze annotations and determine split
      const result = await gpt4oUtils.adjustSplit({
        ocrData,
        ocrText: upload.ocrText,
        annotations: upload.annotationsJson,
        customInstructions,
      })

      logger.log(`Adjust-split result for ${uploadId}`, result)

      // 6. Compute share amounts (50/50 default; null adjustedTotal lets the
      // endpoint keep the existing splitAmount)
      const halfAmount = result.adjustedTotal != null
        ? Math.floor(result.adjustedTotal / 2 * 100) / 100
        : null

      // 7. Resolve via task endpoint — owns initials → userId mapping (PII
      // boundary) and writes paidByMatch + paidByUserId + amounts atomically.
      // History tracking inside the endpoint no-ops when nothing changed.
      const fieldConfidence = {}
      if (result.adjustedTotal != null) fieldConfidence.splitAmount = result.amountConfidence
      if (result.paidBy != null) fieldConfidence.paidByUserId = result.payerConfidence

      await api.post(`/api/splits/${splitId}/task`, {
        adjustedTotal: result.adjustedTotal ?? null,
        userOneShare: halfAmount,
        userTwoShare: halfAmount,
        paidByInitials: result.paidBy ?? null,
        llm: {
          confidence: result.confidence,
          reasoning: result.reasoning,
          fieldConfidence,
          sourceVersion: result.model,
        },
      })

      // 8. Update workflow step status
      await updateWorkflowStatus(authHeaders, { adjustSplitStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'completed', authHeaders)

      logger.log(`Adjust-split complete for ${uploadId}`, {
        splitId,
        originalTotal: result.originalTotal,
        adjustedTotal: result.adjustedTotal,
        paidByInitials: result.paidBy,
        amountConfidence: result.amountConfidence,
        payerConfidence: result.payerConfidence,
      })

      return {
        splitId,
        ...result,
      }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, {
        adjustSplitStatus: WORKFLOW_STEP_STATUS.FAILED,
        error: err.message,
      })
      await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_SPLIT, 'failed', authHeaders, err.message)
      throw err
    }
  },
})
