import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { azureOcrExtract } from '#server/utils/azure-ocr.utils.js'
import { gpt4oUtils } from '#server/utils/azure-gpt4o.utils.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'normalize-receipt'

export const normalizeReceipt = task({
  id: TASK_ID,
  maxDuration: 60,
  run: async (payload) => {
    const { uploadId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { normalizeStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.NORMALIZE, 'processing', authHeaders)

    try {
      // 1. Fetch upload record for ocrJson and originalFilename
      const upload = await api.get(`/api/uploads/${uploadId}?include=ocrJson`)

      // 2. Skip if no OCR data available
      if (!upload.ocrJson) {
        await updateWorkflowStatus(authHeaders, { normalizeStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        logger.log(`Skipped normalize for ${uploadId} — no OCR data`)
        return { skipped: true, reason: 'no_ocr_data' }
      }

      // 3. Extract structured data from Azure DI response
      const fields = azureOcrExtract.extractDocumentFields(upload.ocrJson)
      if (!fields) {
        await updateWorkflowStatus(authHeaders, { normalizeStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        logger.log(`Skipped normalize for ${uploadId} — no document fields`)
        return { skipped: true, reason: 'no_document_fields' }
      }

      const transactionDate = azureOcrExtract.extractTransactionDate(fields)
      const transactionTime = azureOcrExtract.extractTransactionTime(fields)
      const lineItems = azureOcrExtract.extractFlattenedLineItems(fields)

      // 4. Fetch receipt for current merchantName
      const receiptId = upload.receiptId
      if (!receiptId) {
        await updateWorkflowStatus(authHeaders, { normalizeStatus: WORKFLOW_STEP_STATUS.COMPLETED })
        logger.log(`Skipped normalize for ${uploadId} — no receiptId on upload`)
        return { skipped: true, reason: 'no_receipt_id' }
      }

      const receipt = await api.get(`/api/receipts/${receiptId}`)

      // 5. Call GPT-4o-mini for normalization
      const result = await gpt4oUtils.normalizeReceipt({
        transactionDate,
        transactionTime,
        merchantName: receipt.merchantName,
        lineItems,
        originalFilename: upload.originalFilename,
      })

      logger.log(`Normalize result for ${uploadId}`, {
        hasTitle: !!result.title,
        filenameIsHumanNamed: result.filenameIsHumanNamed,
        hasDate: !!result.date,
        hasTime: !!result.time,
        model: result.model,
      })

      // 6. Build receipt update — always write date and time
      const updates = {
        date: result.date || receipt.date,
        time: result.time || null,
      }

      // Only write title if filename is auto-generated
      if (!result.filenameIsHumanNamed && result.title) {
        updates.title = result.title
      }

      // 7. Update receipt via API
      updates.llm = { sourceVersion: result.model }
      await api.put(`/api/receipts/${receiptId}`, updates)

      // 8. Update workflow step status
      await updateWorkflowStatus(authHeaders, { normalizeStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.NORMALIZE, 'completed', authHeaders)

      logger.log(`Normalize complete for ${uploadId}`, {
        receiptId,
        date: updates.date,
        time: updates.time,
        titleUpdated: 'title' in updates,
      })

      return { receiptId, ...result }
    }
    catch (err) {
      await updateWorkflowStatus(authHeaders, {
        normalizeStatus: WORKFLOW_STEP_STATUS.FAILED,
        errors: { [WORKFLOW_STEP.NORMALIZE]: err.message },
      })
      await notifyStatus(runUuid, WORKFLOW_STEP.NORMALIZE, 'failed', authHeaders, err.message)
      throw err
    }
  },
})
