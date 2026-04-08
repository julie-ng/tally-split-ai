import { task, logger } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '../server/db/connection'
import { WORKFLOW_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { UPLOAD_ANALYSIS_STATUS } from '../shared/enums/upload-analysis-status.js'
import { analyzeOcr } from './analyze-ocr'
import { analyzeAnnotations } from './analyze-annotations'
import { createSplit } from './create-split'
import { notifyStatus } from './utils/notify-status.js'

export const receiptWorkflow = task({
  id: 'receipt-workflow',
  maxDuration: 600,
  run: async (payload: { uploadHashId: string, workflowRunId: number, runUuid: string, callbackToken: string }) => {
    const { uploadHashId, workflowRunId, runUuid, callbackToken } = payload
    const db = useDB()

    logger.log(`Starting receipt workflow for ${uploadHashId}`)

    // Update workflow status
    await db
      .update(schema.workflowRuns)
      .set({ status: WORKFLOW_STATUS.PROCESSING })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    // Step 1: OCR — FATAL on failure
    const ocrResult = await analyzeOcr.triggerAndWait(
      { uploadHashId, workflowRunId, runUuid, callbackToken },
    )

    if (!ocrResult.ok) {
      await db
        .update(schema.workflowRuns)
        .set({ status: WORKFLOW_STATUS.FAILED, error: `OCR failed: ${ocrResult.error}` })
        .where(eq(schema.workflowRuns.id, workflowRunId))

      throw new Error(`OCR analysis failed: ${ocrResult.error}`)
    }

    const { receiptId } = ocrResult.output

    // Step 2: Annotations — NON-FATAL
    let hasStepErrors = false

    const annotationsResult = await analyzeAnnotations.triggerAndWait(
      { uploadHashId, workflowRunId, runUuid, callbackToken },
    )

    if (!annotationsResult.ok) {
      hasStepErrors = true
      logger.warn(`Annotations analysis failed, continuing`, { error: annotationsResult.error })
    }

    // Step 3: Create split — NON-FATAL
    let splitId = null

    const splitResult = await createSplit.triggerAndWait(
      { receiptId, workflowRunId, runUuid, callbackToken },
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

    await db
      .update(schema.workflowRuns)
      .set({ status: finalStatus, completedAt: new Date() })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    await db
      .update(schema.uploads)
      .set({
        analysisStatus: UPLOAD_ANALYSIS_STATUS.COMPLETED,
        analyzedAt: new Date(),
      })
      .where(eq(schema.uploads.hashId, uploadHashId))

    await notifyStatus(runUuid, WORKFLOW_STEP.WORKFLOW, finalStatus, callbackToken)

    logger.log(`Receipt workflow ${finalStatus} for ${uploadHashId}`, { receiptId, splitId })

    return { receiptId, splitId }
  },
})
