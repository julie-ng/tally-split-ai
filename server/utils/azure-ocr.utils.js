import { extractDocumentFields } from './azure-ocr/extract-document-fields.js'
import { extractTransactionDate } from './azure-ocr/extract-transaction-date.js'
import { extractTransactionTime } from './azure-ocr/extract-transaction-time.js'
import { extractLineItems } from './azure-ocr/extract-line-items.js'

export const azureOcrExtract = {
  extractDocumentFields,
  extractTransactionDate,
  extractTransactionTime,
  extractLineItems,
}
