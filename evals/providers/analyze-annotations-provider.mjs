import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeAnnotations } from '../../server/utils/llm/analyze-annotations.js'
import { azureOcrExtract } from '../../server/utils/azure-ocr.utils.js'
import { generateBlobSasToken } from '../../server/utils/azure-storage/generate-blob-sas-token.js'
import { shortIdFromCaseDir } from '../utils/case-dir.utils.mjs'

const EVALS_DIR = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Custom promptfoo provider for the analyze-annotations LLM step.
 *
 * Calls the real `analyzeAnnotations()` used in production (same seam as
 * `trigger/analyze-annotations.js`) instead of reimplementing the prompt
 * assembly — so this eval breaks if that function's behavior changes, not
 * just if the prompt text changes.
 *
 * Image is sent as a short-lived SAS URL, not base64 — keeps debug logs
 * free of raw image data. `AZURE_STORAGE_CONTAINER_NAME=evals/datasets`
 * (set by the `eval` npm script) points the SAS helper at the dataset
 * container instead of production `receipts`.
 */
class AnalyzeAnnotationsProvider {
  id () {
    return 'analyze-annotations'
  }

  async callApi (prompt, context) {
    const { caseDir } = context.vars
    const shortId = shortIdFromCaseDir(caseDir)

    const datasetDir = resolve(EVALS_DIR, 'datasets', caseDir)
    const ocrData = JSON.parse(readFileSync(resolve(datasetDir, `${shortId}.input.ocr.json`), 'utf8'))
    const { sasUrl } = generateBlobSasToken(`${caseDir}/${shortId}.jpg`, { permissions: 'read', expiresInMinutes: 1 })

    const fields = azureOcrExtract.extractDocumentFields(ocrData.ocrJson)
    const ocrLineItems = fields ? azureOcrExtract.extractFlattenedLineItems(fields) : []

    const result = await analyzeAnnotations(sasUrl, ocrLineItems)

    return {
      output: result.annotations,
    }
  }
}

export default AnalyzeAnnotationsProvider
