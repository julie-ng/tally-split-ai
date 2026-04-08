import { task, logger } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '../server/db/connection'
import { WORKFLOW_STEP_STATUS } from '../shared/enums/workflow-status.js'
import { azureStorageUtils } from '../server/utils/azure-storage.utils.js'
import { gpt4oUtils } from '../server/utils/azure-gpt4o.utils.js'

export const analyzeAnnotations = task({
  id: 'analyze-annotations',
  maxDuration: 120,
  run: async (payload: { uploadHashId: string, workflowRunId: number }) => {
    const { uploadHashId, workflowRunId } = payload
    const db = useDB()

    // Update workflow step status
    await db
      .update(schema.workflowRuns)
      .set({ annotationsStatus: WORKFLOW_STEP_STATUS.PROCESSING })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    // 1. Fetch upload record (includes ocrJson from OCR step)
    const uploads = await db
      .select()
      .from(schema.uploads)
      .where(eq(schema.uploads.hashId, uploadHashId))

    if (uploads.length === 0) {
      throw new Error(`Upload with hashId '${uploadHashId}' not found`)
    }

    const upload = uploads[0]

    // 2. Generate read-only SAS token
    const { uploadUrl: blobUrlWithSas } = azureStorageUtils.generateBlobSasToken(upload.blobName, {
      permissions: 'read',
      expiresInMinutes: 5,
    })

    // 3. Extract line items from ocrJson (stored by analyzeOcr task)
    let ocrLineItems: any[] = []

    if (upload.ocrJson) {
      const fields = (upload.ocrJson as any)?.analyzeResult?.documents?.[0]?.fields
      const items = fields?.Items?.valueArray || []
      ocrLineItems = items.map((item: any) => ({
        description: item.valueObject?.Description?.content || null,
        quantity: item.valueObject?.Quantity?.valueNumber || null,
        totalPrice: item.valueObject?.TotalPrice?.valueCurrency?.amount || null,
      }))
    }

    // 4. Call GPT-4o for annotation analysis
    const responseData = await gpt4oUtils.analyzeAnnotations(blobUrlWithSas, ocrLineItems)

    // 5. Store result in DB
    await db
      .update(schema.uploads)
      .set({ annotationsJson: responseData })
      .where(eq(schema.uploads.hashId, uploadHashId))

    // 6. Update workflow step status
    await db
      .update(schema.workflowRuns)
      .set({ annotationsStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    logger.log(`Annotations analysis complete for ${uploadHashId}`)

    return { annotations: responseData.annotations }
  },
})
