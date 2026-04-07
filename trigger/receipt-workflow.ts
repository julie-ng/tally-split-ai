import { task, logger } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '../server/db/connection'
import { analyzeOcr } from './analyze-ocr'
import { analyzeAnnotations } from './analyze-annotations'
import { createSplit } from './create-split'

export const receiptWorkflow = task({
  id: 'receipt-workflow',
  maxDuration: 600,
  run: async (payload: { uploadHashId: string, userId: string, workflowRunId: number }) => {
    const { uploadHashId, userId, workflowRunId } = payload
    const db = useDB()

    logger.log(`Starting receipt workflow for ${uploadHashId}`)

    // Update workflow status
    await db
      .update(schema.workflowRuns)
      .set({ status: 'processing' })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    // Step 1: OCR — FATAL on failure
    const ocrResult = await analyzeOcr.triggerAndWait(
      { uploadHashId, workflowRunId },
    )

    if (!ocrResult.ok) {
      await db
        .update(schema.workflowRuns)
        .set({ status: 'failed', error: `OCR failed: ${ocrResult.error}` })
        .where(eq(schema.workflowRuns.id, workflowRunId))

      throw new Error(`OCR analysis failed: ${ocrResult.error}`)
    }

    const { receiptId } = ocrResult.output

    // Step 2: Annotations — NON-FATAL
    const annotationsResult = await analyzeAnnotations.triggerAndWait(
      { uploadHashId, workflowRunId },
    )

    if (!annotationsResult.ok) {
      logger.warn(`Annotations analysis failed, continuing`, { error: annotationsResult.error })
    }

    // Step 3: Create split — NON-FATAL
    let splitId = null

    const splitResult = await createSplit.triggerAndWait(
      { receiptId, userId, workflowRunId },
    )

    if (splitResult.ok) {
      splitId = splitResult.output.splitId
    }
    else {
      logger.warn(`Split creation failed`, { error: splitResult.error })
    }

    // Finalize: update workflow first, then upload (prevents false positives)
    await db
      .update(schema.workflowRuns)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    await db
      .update(schema.uploads)
      .set({
        analysisStatus: 'completed',
        analyzedAt: new Date(),
      })
      .where(eq(schema.uploads.hashId, uploadHashId))

    logger.log(`Receipt workflow complete for ${uploadHashId}`, { receiptId, splitId })

    return { receiptId, splitId }
  },
})
