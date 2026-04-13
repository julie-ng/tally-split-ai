import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '../shared/enums/upload-analysis-status.js'
import { getTaskActions } from '../shared/config/task-permissions.js'
import { generateCallbackToken } from '../server/utils/workflow-token.utils.js'
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
    const { uploadHashId, runUuid, runCreatedAt, scope, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }

    // Generate per-task tokens with action-scoped permissions
    const tokenParams = { runUuid, runCreatedAt, scope }
    const ocrToken = generateCallbackToken({ ...tokenParams, actions: getTaskActions('analyze-ocr') })
    const annotationsToken = generateCallbackToken({ ...tokenParams, actions: getTaskActions('analyze-annotations') })
    const splitToken = generateCallbackToken({ ...tokenParams, actions: getTaskActions('create-split') })

    logger.log(`Starting receipt workflow for ${uploadHashId}`)

    // Update workflow status
    await updateWorkflowStatus(authHeaders, { status: WORKFLOW_STATUS.PROCESSING })

    // Step 1: OCR — FATAL on failure
    const ocrResult = await analyzeOcr.triggerAndWait(
      { uploadHashId, runUuid, callbackToken: ocrToken },
    )

    if (!ocrResult.ok) {
      await updateWorkflowStatus(authHeaders, {
        status: WORKFLOW_STATUS.FAILED,
        error: `OCR failed: ${ocrResult.error}`,
      })

      throw new Error(`OCR analysis failed: ${ocrResult.error}`)
    }

    const { receiptId } = ocrResult.output

    // Step 2: Annotations — NON-FATAL
    let hasStepErrors = false

    const annotationsResult = await analyzeAnnotations.triggerAndWait(
      { uploadHashId, runUuid, callbackToken: annotationsToken },
    )

    if (!annotationsResult.ok) {
      hasStepErrors = true
      logger.warn(`Annotations analysis failed, continuing`, { error: annotationsResult.error })
    }

    // Step 3: Create split — NON-FATAL
    let splitId = null

    const splitResult = await createSplit.triggerAndWait(
      { receiptId, runUuid, callbackToken: splitToken },
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
