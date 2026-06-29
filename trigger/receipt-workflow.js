import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STATUS, WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '#shared/enums/upload-analysis-status.js'
import { analyzeOcr } from './analyze-ocr.js'
import { analyzeAnnotations } from './analyze-annotations.js'
import { normalizeReceipt } from './normalize-receipt.js'
import { createExpense } from './create-expense.js'
import { adjustExpense } from './adjust-expense.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'receipt-workflow'

export const receiptWorkflow = task({
  id: TASK_ID,
  maxDuration: 600,
  run: async (payload) => {
    const { uploadId, runUuid, callbackToken, customInstructions, llmConsent, householdMembers } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    logger.log(`Starting receipt workflow for ${uploadId}`)

    // Update workflow status
    await updateWorkflowStatus(authHeaders, { status: WORKFLOW_STATUS.PROCESSING })

    let hasStepErrors = false
    // eslint-disable-next-line no-useless-assignment
    let receiptId = null
    let expenseId = null

    try {
      // Phase 1: OCR — request token before receipt exists
      const { tokens: ocrTokens } = await api.post(`/api/workflows/runs/${runUuid}/tokens`, {
        taskIds: ['analyze-ocr'],
      })

      // Step 1: OCR — FATAL on failure
      const ocrResult = await analyzeOcr.triggerAndWait(
        { uploadId, runUuid, callbackToken: ocrTokens['analyze-ocr'] },
      )

      if (!ocrResult.ok) {
        throw new Error(`OCR failed: ${ocrResult.error}`)
      }

      const { receiptData, title, existingReceiptId } = ocrResult.output

      // Create or update receipt from OCR results, then link to upload
      receiptId = existingReceiptId

      if (receiptId) {
        await api.put(`/api/receipts/${receiptId}`, receiptData)
        logger.log(`Updated existing receipt ${receiptId}`)
      }
      else {
        const createResult = await api.post('/api/receipts', {
          ...receiptData,
          title,
        })
        receiptId = createResult.created.id
        logger.log(`Created new receipt ${receiptId}`)
      }

      // Link receipt to upload
      await api.put(`/api/uploads/${uploadId}`, { receiptId })

      // Phase 2: Post-OCR tasks — request tokens now that receipt is linked
      const { tokens: postOcrTokens } = await api.post(`/api/workflows/runs/${runUuid}/tokens`, {
        taskIds: ['analyze-annotations', 'normalize-receipt', 'create-expense', 'adjust-expense'],
      })

      // Step 2: Annotations — NON-FATAL
      const annotationsResult = await analyzeAnnotations.triggerAndWait(
        { uploadId, runUuid, callbackToken: postOcrTokens['analyze-annotations'], customInstructions },
      )

      if (!annotationsResult.ok) {
        hasStepErrors = true
        await updateWorkflowStatus(authHeaders, {
          annotationsStatus: WORKFLOW_STEP_STATUS.FAILED,
          errors: { [WORKFLOW_STEP.ANNOTATIONS]: annotationsResult.error },
        })
        await notifyStatus(runUuid, WORKFLOW_STEP.ANNOTATIONS, 'failed', authHeaders, annotationsResult.error)
        logger.warn(`Annotations analysis failed, continuing`, { error: annotationsResult.error })
      }

      // Step 3: Normalize receipt — NON-FATAL
      const normalizeResult = await normalizeReceipt.triggerAndWait(
        { uploadId, runUuid, callbackToken: postOcrTokens['normalize-receipt'] },
      )

      if (!normalizeResult.ok) {
        hasStepErrors = true
        await updateWorkflowStatus(authHeaders, {
          normalizeStatus: WORKFLOW_STEP_STATUS.FAILED,
          errors: { [WORKFLOW_STEP.NORMALIZE]: normalizeResult.error },
        })
        await notifyStatus(runUuid, WORKFLOW_STEP.NORMALIZE, 'failed', authHeaders, normalizeResult.error)
        logger.warn(`Normalize failed, continuing`, { error: normalizeResult.error })
      }

      // Step 4: Create expense — NON-FATAL
      const expenseResult = await createExpense.triggerAndWait(
        { receiptId, uploadId, runUuid, callbackToken: postOcrTokens['create-expense'] },
      )

      if (expenseResult.ok) {
        expenseId = expenseResult.output.expenseId
      }
      else {
        hasStepErrors = true
        await updateWorkflowStatus(authHeaders, {
          createExpenseStatus: WORKFLOW_STEP_STATUS.FAILED,
          errors: { [WORKFLOW_STEP.EXPENSE]: expenseResult.error },
        })
        await notifyStatus(runUuid, WORKFLOW_STEP.EXPENSE, 'failed', authHeaders, expenseResult.error)
        logger.warn(`Expense creation failed`, { error: expenseResult.error })
      }

      // Step 5: Adjust expense — NON-FATAL, requires both split and annotations.
      // Gated on household llmConsent: this task sends member names/initials to
      // the LLM, so it's skipped entirely for households that haven't opted in.
      // No-consent households keep the API-default 50/50 split from step 4.
      if (expenseId && annotationsResult.ok && llmConsent) {
        const adjustResult = await adjustExpense.triggerAndWait(
          { uploadId, expenseId, runUuid, callbackToken: postOcrTokens['adjust-expense'], customInstructions, householdMembers },
        )

        if (!adjustResult.ok) {
          hasStepErrors = true
          await updateWorkflowStatus(authHeaders, {
            adjustExpenseStatus: WORKFLOW_STEP_STATUS.FAILED,
            errors: { [WORKFLOW_STEP.ADJUST_EXPENSE]: adjustResult.error },
          })
          await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'failed', authHeaders, adjustResult.error)
          logger.warn(`Adjust-split failed, continuing`, { error: adjustResult.error })
        }
      }
      else if (expenseId && annotationsResult.ok && !llmConsent) {
        // Preconditions met, but the household hasn't consented to LLM analysis.
        // Mark the step SKIPPED (not FAILED — it intentionally didn't run, and
        // not COMPLETED — it did no work) so it doesn't sit at 'pending' forever
        // and the run can finalize cleanly.
        await updateWorkflowStatus(authHeaders, {
          adjustExpenseStatus: WORKFLOW_STEP_STATUS.SKIPPED,
        })
        await notifyStatus(runUuid, WORKFLOW_STEP.ADJUST_EXPENSE, 'skipped', authHeaders)
        logger.info('Adjust-split skipped — household has not consented to LLM analysis')
      }
    }
    catch (err) {
      // Orchestrator-level failure (fatal step error, network glitch,
      // unexpected exception). Always finalize status so the UI can
      // re-trigger; never leave a run stuck in 'processing'.
      logger.error(`Receipt workflow failed for ${uploadId}`, { error: err.message })

      await updateWorkflowStatus(authHeaders, {
        status: WORKFLOW_STATUS.FAILED,
        completedAt: new Date().toISOString(),
        analysisStatus: UPLOAD_ANALYSIS_STATUS.COMPLETED,
        errors: { [WORKFLOW_STEP.ORCHESTRATOR]: err.message },
      })
      await notifyStatus(runUuid, WORKFLOW_STEP.ORCHESTRATOR, 'failed', authHeaders, err.message)

      throw err
    }

    // Finalize: update workflow first, then upload (prevents false positives)
    const finalStatus = hasStepErrors ? WORKFLOW_STATUS.PARTIAL : WORKFLOW_STATUS.COMPLETED

    await updateWorkflowStatus(authHeaders, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      analysisStatus: UPLOAD_ANALYSIS_STATUS.COMPLETED,
    })

    await notifyStatus(runUuid, WORKFLOW_STEP.ORCHESTRATOR, finalStatus, authHeaders)

    logger.log(`Receipt workflow ${finalStatus} for ${uploadId}`, { receiptId, expenseId })

    return { receiptId, expenseId }
  },
})
