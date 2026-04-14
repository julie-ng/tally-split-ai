import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { azureStorageUtils } from '#server/utils/azure-storage.utils.js'
import { gpt4oUtils } from '#server/utils/azure-gpt4o.utils.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'
import { notifyStatus } from './utils/notify-status.js'

const TASK_ID = 'analyze-annotations'

export const analyzeAnnotations = task({
  id: TASK_ID,
  maxDuration: 120,
  run: async (payload) => {
    const { uploadHashId, runUuid, callbackToken } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { annotationsStatus: WORKFLOW_STEP_STATUS.PROCESSING })
    await notifyStatus(runUuid, WORKFLOW_STEP.ANNOTATIONS, 'processing', authHeaders)

    try {
      // 1. Fetch upload record via API (includes ocrJson from OCR step)
      logger.log(`Fetching upload ${uploadHashId}`)
      const upload = await api.get(`/api/uploads/${uploadHashId}`)
      logger.log(`Upload fetched`, { blobName: upload.blobName, hasOcrJson: !!upload.ocrJson })

      // 2. Generate read-only SAS token
      const { uploadUrl: blobUrlWithSas } = azureStorageUtils.generateBlobSasToken(upload.blobName, {
        permissions: 'read',
        expiresInMinutes: 5,
      })

      // 3. Extract line items from ocrJson (stored by analyzeOcr task)
      let ocrLineItems = []

      if (upload.ocrJson) {
        const fields = upload.ocrJson?.analyzeResult?.documents?.[0]?.fields
        const items = fields?.Items?.valueArray || []
        ocrLineItems = items.map(item => ({
          description: item.valueObject?.Description?.content || null,
          quantity: item.valueObject?.Quantity?.valueNumber || null,
          totalPrice: item.valueObject?.TotalPrice?.valueCurrency?.amount || null,
        }))
      }

      logger.log(`Calling GPT-4o for annotations`, { lineItemCount: ocrLineItems.length })
      const startTime = Date.now()

      // 4. Call GPT-4o for annotation analysis
      const responseData = await gpt4oUtils.analyzeAnnotations(blobUrlWithSas, ocrLineItems)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      logger.log(`GPT-4o responded in ${elapsed}s`, {
        annotationCount: responseData.annotations?.annotations?.length ?? 0,
      })

      // 5. Store result via API
      await api.put(`/api/uploads/${uploadHashId}`, { annotationsJson: responseData })

      // 6. Update workflow step status
      await updateWorkflowStatus(authHeaders, { annotationsStatus: WORKFLOW_STEP_STATUS.COMPLETED })
      await notifyStatus(runUuid, WORKFLOW_STEP.ANNOTATIONS, 'completed', authHeaders)

      logger.log(`Annotations analysis complete for ${uploadHashId}`)

      return { annotations: responseData.annotations }
    }
    catch (err) {
      logger.error(`Annotations analysis failed for ${uploadHashId}`, {
        error: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'),
      })
      await updateWorkflowStatus(authHeaders, { annotationsStatus: WORKFLOW_STEP_STATUS.FAILED })
      throw err
    }
  },
})
