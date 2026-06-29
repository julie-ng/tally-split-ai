import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { azureOcrExtract } from '#server/utils/azure-ocr.utils.js'
import { gpt4oUtils } from '#server/utils/azure-gpt4o.utils.js'
import { resolveShares } from '#shared/utils/expenses/resolve-shares.utils.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'adjust-expense'

export const adjustExpense = task({
  id: TASK_ID,
  maxDuration: 60,
  run: async (payload) => {
    const { uploadId, expenseId, runUuid, callbackToken, customInstructions, householdMembers } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { adjustExpenseStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'processing', authHeaders)

    try {
      // 1. Fetch upload for OCR and annotations data
      const upload = await api.get(`/api/uploads/${uploadId}?include=ocrJson,annotationsJson`)

      // 2. Skip if there's nothing for the LLM to act on — neither annotations
      // nor custom instructions. Running the model with empty inputs would
      // just echo the original total with low confidence.
      const hasAnnotations = !!upload.annotationsJson?.annotations?.length
      const hasCustomInstructions = !!customInstructions?.trim()
      if (!hasAnnotations && !hasCustomInstructions) {
        await updateWorkflowStatus(authHeaders, { adjustExpenseStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'completed', authHeaders)

        logger.log(`Skipped adjust-expense for ${uploadId} — no annotations and no custom instructions`)
        return { skipped: true, reason: 'no_inputs' }
      }

      // 3. Skip if no OCR data
      if (!upload.ocrJson) {
        await updateWorkflowStatus(authHeaders, { adjustExpenseStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'completed', authHeaders)

        logger.log(`Skipped adjust-expense for ${uploadId} — no OCR data`)
        return { skipped: true, reason: 'no_ocr_data' }
      }

      // 4. Extract condensed OCR data for LLM consumption
      const ocrData = azureOcrExtract.extractForLlm(upload.ocrJson)
      if (!ocrData) {
        await updateWorkflowStatus(authHeaders, { adjustExpenseStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        logger.log(`Skipped adjust-expense for ${uploadId} — no document fields`)
        return { skipped: true, reason: 'no_document_fields' }
      }

      // 5. Call GPT-4o-mini to analyze annotations and determine split.
      // householdMembers ({ user1, user2 } = { firstName, initials }) lets the
      // model map handwriting → a person and allocate asymmetric shares + payer
      // by slot. Only present when the household consented to LLM analysis.
      const result = await gpt4oUtils.adjustExpense({
        ocrData,
        ocrText: upload.ocrText,
        annotations: upload.annotationsJson,
        customInstructions,
        householdMembers,
      })

      logger.log(`Adjust-expense result for ${uploadId}`, {
        hasPaidBy: result.paidBy != null,
        hasAdjustedTotal: result.adjustedTotal != null,
        hasShares: result.shares != null,
        confidence: result.confidence,
        amountConfidence: result.amountConfidence,
        shareConfidence: result.shareConfidence,
        payerConfidence: result.payerConfidence,
        model: result.model,
      })

      // 6. Resolve per-person shares from the LLM's slot allocation, with a
      // 50/50 fallback. The model returns shares keyed by slot
      // ({ user1, user2 }); we map user1 → userOneShare, user2 → userTwoShare.
      // Fall back to an even split when the model didn't allocate, the values
      // are non-numeric, or they don't sum to the adjusted total (model error) —
      // never persist inconsistent shares.
      const { userOneShare, userTwoShare, usedFallback } = resolveShares(
        result.adjustedTotal,
        result.shares,
      )
      if (usedFallback && result.adjustedTotal != null) {
        logger.warn(`Adjust-expense fell back to 50/50 for ${uploadId}`, { shares: result.shares })
      }

      // 7. Resolve via task endpoint — owns slot → userId mapping (PII boundary)
      // and writes paidByMatch + paidByUserId + amounts atomically. History
      // tracking inside the endpoint no-ops when nothing changed.
      const fieldConfidence = {}
      if (result.adjustedTotal != null) fieldConfidence.splitAmount = result.amountConfidence
      if (result.paidBy != null) fieldConfidence.paidByUserId = result.payerConfidence
      // Share confidence applies to both share fields (it's one allocation).
      if (!usedFallback && result.shareConfidence != null) {
        fieldConfidence.userOneShare = result.shareConfidence
        fieldConfidence.userTwoShare = result.shareConfidence
      }

      await api.post(`/api/expenses/${expenseId}/task`, {
        adjustedTotal: result.adjustedTotal ?? null,
        userOneShare,
        userTwoShare,
        // Slot-based payer: 'user1' | 'user2' | 'mismatched' | null. The endpoint
        // maps slot → userId and sets paidByMatch accordingly.
        paidBySlot: result.paidBy ?? null,
        llm: {
          confidence: result.confidence,
          reasoning: result.reasoning,
          fieldConfidence,
          sourceVersion: result.model,
        },
      })

      // 8. Update workflow step status
      await updateWorkflowStatus(authHeaders, { adjustExpenseStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'completed', authHeaders)

      logger.log(`Adjust-expense complete for ${uploadId}`, {
        expenseId,
        hasAdjustedTotal: result.adjustedTotal != null,
        hasPaidBy: result.paidBy != null,
        amountConfidence: result.amountConfidence,
        payerConfidence: result.payerConfidence,
      })

      return {
        expenseId,
        ...result,
      }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, {
        adjustExpenseStatus: WORKFLOW_STEP_STATUS.FAILED,
        errors: { [WORKFLOW_STEP.ADJUST_EXPENSE]: err.message },
      })
      await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'failed', authHeaders, err.message)
      throw err
    }
  },
})
