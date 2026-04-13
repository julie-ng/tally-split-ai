import { task, logger } from '@trigger.dev/sdk/v3'
import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from '@azure-rest/ai-document-intelligence'
import { WORKFLOW_STEP_STATUS } from '../shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '../shared/enums/workflow-step.js'
import { azureStorageUtils } from '../server/utils/azure-storage.utils.js'
import { getAzureDocumentIntelligenceConfig } from '../server/utils/azure-document-intelligence.js'
import { receiptUtils } from '../shared/utils/receipt.utils.js'
import { receiptInputSchema } from '../shared/utils/zod-schemas/receipt.schema.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'analyze-ocr'

export const analyzeOcr = task({
  id: TASK_ID,
  maxDuration: 300,
  run: async (payload) => {
    const { uploadHashId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { ocrStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.OCR, 'processing', authHeaders)

    try {
      // 1. Fetch upload record via API
      const upload = await api.get(`/api/uploads/${uploadHashId}`)

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

      // 5. Store OCR results on upload (no receiptId — orchestrator handles receipt creation)
      await api.put(`/api/uploads/${uploadHashId}`, {
        ocrText: analyzeResult.content || null,
        ocrJson: result.body,
      })

      // 6. Update workflow step status
      await updateWorkflowStatus(authHeaders, { ocrStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.OCR, 'completed', authHeaders)

      logger.log(`OCR analysis complete for ${uploadHashId}`)

      // Return results to orchestrator for receipt creation + upload linking
      return {
        receiptData,
        title: upload.title || 'Untitled',
        tags: receiptUtils.azureTagsToReceiptTags(upload.azureTags),
        existingReceiptId: upload.receiptId,
      }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, { ocrStatus: WORKFLOW_STEP_STATUS.FAILED })
      throw err
    }
  },
})
