import { task, logger } from '@trigger.dev/sdk/v3'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-step-status.js'
import { WORKFLOW_STEP } from '#shared/enums/workflow-step.js'
import { llmUtils } from '#server/utils/llm.utils.js'
import { azureOcrExtract } from '#server/utils/azure-ocr.utils.js'
import { createApiClient, updateWorkflowStatus } from './utils/api-client.js'

const TASK_ID = 'analyze-annotations'

export const analyzeAnnotations = task({
  id: TASK_ID,
  maxDuration: 120,
  run: async (payload) => {
    const { uploadId, runUuid, callbackToken, customInstructions } = payload
    const authHeaders = { callbackToken, runUuid, taskId: TASK_ID }
    const api = createApiClient(authHeaders)

    // Update workflow step status
    await updateWorkflowStatus(authHeaders, { annotationsStatus: WORKFLOW_STEP_STATUS.PROCESSING })

    try {
      // 1. Fetch upload record via API (includes ocrJson from OCR step)
      logger.log(`Fetching upload ${uploadId}`)
      const upload = await api.get(`/api/uploads/${uploadId}?include=ocrJson,annotationsJson`)
      logger.log(`Upload fetched`, { blobName: upload.blobName, hasOcrJson: !!upload.ocrJson })

      // 2. Request a read-only SAS URL from the Nuxt API.
      //    The storage account key never leaves the server — see
      //    server/api/tokens/read.post.js for the dual-auth handler.
      const { blobUrlWithSas } = await api.post('/api/tokens/read', {
        action: 'read',
        blobName: upload.blobName,
      })

      // 3. Extract line items from ocrJson (stored by analyzeOcr task).
      // IMPORTANT: the LLM reports `lineItemIndex` as a position in this array,
      // so it must stay a straight 1:1 map of Azure's Items — never filtered or
      // reordered, or the indices point at the wrong items.
      const fields = azureOcrExtract.extractDocumentFields(upload.ocrJson)
      const ocrLineItems = fields ? azureOcrExtract.extractFlattenedLineItems(fields) : []

      logger.log(`Calling LLM for annotations`, { lineItemCount: ocrLineItems.length })
      const startTime = Date.now()

      // 4. Call the LLM for annotation analysis
      const responseData = await llmUtils.analyzeAnnotations(blobUrlWithSas, ocrLineItems, customInstructions)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      // 5. Flatten and slim before storing — drop raw API envelope, keep only what we need
      const slimAnnotations = llmUtils.slimAnnotationsResponse(responseData)

      logger.log(`LLM responded in ${elapsed}s`, {
        annotationCount: slimAnnotations.annotations.length,
      })

      // 6. Store slimmed result via API
      await api.put(`/api/uploads/${uploadId}`, { annotationsJson: slimAnnotations })

      // 7. Update workflow step status
      await updateWorkflowStatus(authHeaders, { annotationsStatus: WORKFLOW_STEP_STATUS.COMPLETED })

      logger.log(`Annotations analysis complete for ${uploadId}`)

      return { annotations: slimAnnotations.annotations }
    }
    catch (err) {
      logger.error(`Annotations analysis failed for ${uploadId}`, {
        error: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'),
      })
      await updateWorkflowStatus(authHeaders, {
        annotationsStatus: WORKFLOW_STEP_STATUS.FAILED,
        errors: { [WORKFLOW_STEP.ANNOTATIONS]: err.message },
      })
      throw err
    }
  },
})
