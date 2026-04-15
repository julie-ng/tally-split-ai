import { extractDocumentFields } from './azure-ocr/extract-document-fields.js'
import { extractTransactionDate } from './azure-ocr/extract-transaction-date.js'
import { extractTransactionTime } from './azure-ocr/extract-transaction-time.js'
import { extractFlattenedLineItems } from './azure-ocr/extract-flattened-line-items.js'
import { extractForLlm } from './azure-ocr/extract-for-llm.js'
import { slimOcrResponse } from './azure-ocr/slim-ocr-response.js'

export const azureOcrExtract = {
  extractDocumentFields,
  extractTransactionDate,
  extractTransactionTime,
  extractFlattenedLineItems,
  extractForLlm,
  slimOcrResponse,
}
