import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '../shared/enums/upload-analysis-status.js'
import { analyzeOcr } from './analyze-ocr.js'
import { analyzeAnnotations } from './analyze-annotations.js'
import { normalizeReceipt } from './normalize-receipt.js'
import { createSplit } from './create-split.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'receipt-workflow'

export const receiptWorkflow = task({
  id: TASK_ID,
  maxDuration: 600,
  run: async (payload) => {
    const { uploadHashId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    logger.log(`Starting receipt workflow for ${uploadHashId}`)

    // Update workflow status
    await updateWorkflowStatus(authHeaders, { status: WORKFLOW_STATUS.PROCESSING })

    // Phase 1: OCR — request token before receipt exists
    const { tokens: ocrTokens } = await api.post(`/api/workflows/runs/${runUuid}/tokens`, {
      taskIds: ['analyze-ocr'],
    })

    // Step 1: OCR — FATAL on failure
    const ocrResult = await analyzeOcr.triggerAndWait(
      { uploadHashId, runUuid, callbackToken: ocrTokens['analyze-ocr'] },
    )

    if (!ocrResult.ok) {
      await updateWorkflowStatus(authHeaders, {
        status: WORKFLOW_STATUS.FAILED,
        error: `OCR failed: ${ocrResult.error}`,
      })

      throw new Error(`OCR analysis failed: ${ocrResult.error}`)
    }

    const { receiptData, title, tags, existingReceiptId } = ocrResult.output

    // Create or update receipt from OCR results, then link to upload
    let receiptId = existingReceiptId

    if (receiptId) {
      await api.put(`/api/receipts/${receiptId}`, receiptData)
      logger.log(`Updated existing receipt ${receiptId}`)
    }
    else {
      const createResult = await api.post('/api/receipts', {
        ...receiptData,
        title,
        tags,
      })
      receiptId = createResult.created.id
      logger.log(`Created new receipt ${receiptId}`)
    }

    // Link receipt to upload
    await api.put(`/api/uploads/${uploadHashId}`, { receiptId })

    // Phase 2: Post-OCR tasks — request tokens now that receipt is linked
    const { tokens: postOcrTokens } = await api.post(`/api/workflows/runs/${runUuid}/tokens`, {
      taskIds: ['analyze-annotations', 'normalize-receipt', 'create-split'],
    })

    // Step 2: Annotations — NON-FATAL
    let hasStepErrors = false

    const annotationsResult = await analyzeAnnotations.triggerAndWait(
      { uploadHashId, runUuid, callbackToken: postOcrTokens['analyze-annotations'] },
    )

    if (!annotationsResult.ok) {
      hasStepErrors = true
      logger.warn(`Annotations analysis failed, continuing`, { error: annotationsResult.error })
    }

    // Step 3: Normalize receipt — NON-FATAL
    const normalizeResult = await normalizeReceipt.triggerAndWait(
      { uploadHashId, runUuid, callbackToken: postOcrTokens['normalize-receipt'] },
    )

    if (!normalizeResult.ok) {
      hasStepErrors = true
      logger.warn(`Normalize failed, continuing`, { error: normalizeResult.error })
    }

    // Step 4: Create split — NON-FATAL
    let splitId = null

    const splitResult = await createSplit.triggerAndWait(
      { receiptId, runUuid, callbackToken: postOcrTokens['create-split'] },
    )

    if (splitResult.ok) {
      splitId = splitResult.output.splitId
    }
    else {
      hasStepErrors = true
      logger.warn(`Split creation failed`, { error: splitResult.error })
    }

    // Finalize: update workflow first, then upload (prevents false positives)
    const finalStatus = hasStepErrors ? WORKFLOW_STATUS.PARTIAL : WORKFLOW_STATUS.COMPLETED

    await updateWorkflowStatus(authHeaders, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      analysisStatus: UPLOAD_ANALYSIS_STATUS.COMPLETED,
    })

    await notifyStatus(runUuid, WORKFLOW_STEP.WORKFLOW, finalStatus, authHeaders)

    logger.log(`Receipt workflow ${finalStatus} for ${uploadHashId}`, { receiptId, splitId })

    return { receiptId, splitId }
  },
})
