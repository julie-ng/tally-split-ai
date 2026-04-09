import { task, logger } from '@trigger.dev/sdk/v3'
import { eq } from 'drizzle-orm'
import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from '@azure-rest/ai-document-intelligence'
import { useDB, schema } from '../server/db/connection.js'
import { WORKFLOW_STEP_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { azureStorageUtils } from '../server/utils/azure-storage.utils.js'
import { getAzureDocumentIntelligenceConfig } from '../server/utils/azure-document-intelligence.js'
import { receiptUtils } from '../shared/utils/receipt.utils.js'
import { receiptInputSchema } from '../shared/utils/zod-schemas/receipt.schema.js'
import { notifyStatus } from './utils/notify-status.js'

export const analyzeOcr = task({
  id: 'analyze-ocr',
  maxDuration: 300,
  run: async (payload) => {
    const { uploadHashId, workflowRunId, runUuid, callbackToken } = payload
    const db = useDB()

    // Update workflow step status
    await db
      .update(schema.workflowRuns)
      .set({ ocrStatus: WORKFLOW_STEP_STATUS.PROCESSING })
      .where(eq(schema.workflowRuns.id, workflowRunId))

    try {
      // 1. Fetch upload record
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

      // 3. Call Azure Document Intelligence
      const { endpoint, key } = getAzureDocumentIntelligenceConfig()
      const client = DocumentIntelligence(endpoint, { key })

      const initialResponse = await client
        .path('/documentModels/{modelId}:analyze', 'prebuilt-receipt')
        .post({
          contentType: 'application/json',
          body: { urlSource: blobUrlWithSas },
        })

      if (isUnexpected(initialResponse)) {
        throw new Error(`Document Intelligence unexpected response: ${JSON.stringify(initialResponse.body)}`)
      }

      const poller = getLongRunningPoller(client, initialResponse)
      const result = await poller.pollUntilDone()
      const analyzeResult = result.body.analyzeResult

      // 4. Extract and validate receipt data
      const documents = analyzeResult?.documents
      const document = documents && documents[0]

      if (!document) {
        throw new Error('No receipt document found in analysis result')
      }

      const fields = document.fields

      const receiptData = receiptInputSchema.parse({
        merchantName: fields.MerchantName?.content || null,
        merchantAddress: fields.MerchantAddress?.content || null,
        merchantPhone: fields.MerchantPhoneNumber?.content || null,
        date: fields.TransactionDate?.valueDate || null,
        subtotal: fields.Subtotal?.valueCurrency?.amount
          || fields.TaxDetails?.valueArray?.[0]?.valueObject?.NetAmount?.valueCurrency?.amount
          || null,
        total: fields.Total?.valueCurrency?.amount || null,
        currency: fields.Total?.valueCurrency?.currencyCode || null,
        tax: fields.TotalTax?.valueCurrency?.amount || null,
        analysisStatus: 'analyzed',
      })

      // 5. Create or update receipt
      const uploadWithReceipt = await db.query.uploads.findFirst({
        where: eq(schema.uploads.hashId, uploadHashId),
        with: { receipt: true },
      })

      let receiptId = uploadWithReceipt?.receiptId

      if (receiptId) {
        await db
          .update(schema.receipts)
          .set({ ...receiptData, updatedAt: new Date() })
          .where(eq(schema.receipts.id, receiptId))
        logger.log(`Updated existing receipt ${receiptId}`)
      }
      else {
        const [newReceipt] = await db
          .insert(schema.receipts)
          .values({
            ...receiptData,
            userId: upload.userId,
            title: upload.title || 'Untitled',
            tags: receiptUtils.azureTagsToReceiptTags(upload.azureTags),
          })
          .returning()
        receiptId = newReceipt.id
        logger.log(`Created new receipt ${receiptId}`)
      }

      // 6. Update upload with OCR results
      await db
        .update(schema.uploads)
        .set({
          ocrText: analyzeResult.content || null,
          ocrJson: result.body,
          receiptId,
        })
        .where(eq(schema.uploads.hashId, uploadHashId))

      // 7. Update workflow step status
      await db
        .update(schema.workflowRuns)
        .set({ ocrStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        .where(eq(schema.workflowRuns.id, workflowRunId))

      await notifyStatus(runUuid, WORKFLOW_STEP.OCR, 'completed', callbackToken)

      logger.log(`OCR analysis complete for ${uploadHashId}`, { receiptId })

      return { receiptId, receiptData }
    }
    catch (err) {
      await db
        .update(schema.workflowRuns)
        .set({ ocrStatus: WORKFLOW_STEP_STATUS.FAILED })
        .where(eq(schema.workflowRuns.id, workflowRunId))

      throw err
    }
  },
})
