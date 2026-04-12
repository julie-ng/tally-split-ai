import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '../shared/enums/upload-analysis-status.js'
import { analyzeOcr } from './analyze-ocr.js'
import { analyzeAnnotations } from './analyze-annotations.js'
import { createSplit } from './create-split.js'
import { updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'receipt-workflow'

export const receiptWorkflow = task({
  id: TASK_ID,
  maxDuration: 600,
  run: async (payload) => {
    const { uploadHashId, runUuid, callbackToken } = payload
    const auth = { callbackToken, runUuid, taskId: TASK_ID }

    logger.log(`Starting receipt workflow for ${uploadHashId}`)

    // Update workflow status
    await updateWorkflowStatus(auth, { status: WORKFLOW_STATUS.PROCESSING })

    // Step 1: OCR — FATAL on failure
    const ocrResult = await analyzeOcr.triggerAndWait(
      { uploadHashId, runUuid, callbackToken },
    )

    if (!ocrResult.ok) {
      await updateWorkflowStatus(auth, {
        status: WORKFLOW_STATUS.FAILED,
        error: `OCR failed: ${ocrResult.error}`,
      })

      throw new Error(`OCR analysis failed: ${ocrResult.error}`)
    }

    const { receiptId } = ocrResult.output

    // Step 2: Annotations — NON-FATAL
    let hasStepErrors = false

    const annotationsResult = await analyzeAnnotations.triggerAndWait(
      { uploadHashId, runUuid, callbackToken },
    )

    if (!annotationsResult.ok) {
      hasStepErrors = true
      logger.warn(`Annotations analysis failed, continuing`, { error: annotationsResult.error })
    }

    // Step 3: Create split — NON-FATAL
    let splitId = null

    const splitResult = await createSplit.triggerAndWait(
      { receiptId, runUuid, callbackToken },
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

    await updateWorkflowStatus(auth, {
      status: finalStatus,
      completedAt: new Date().toISOString(),
      analysisStatus: UPLOAD_ANALYSIS_STATUS.COMPLETED,
    })

    await notifyStatus(runUuid, WORKFLOW_STEP.WORKFLOW, finalStatus, callbackToken)

    logger.log(`Receipt workflow ${finalStatus} for ${uploadHashId}`, { receiptId, splitId })

    return { receiptId, splitId }
  },
})
