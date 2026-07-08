import { llmGenerate } from './llm-generate.js'
import { loadInstructions } from './load-instructions.js'
import { normalizeReceiptSchema } from './schemas.js'
import { getGatewayModels } from './get-llm-config.js'

/**
 * Normalize receipt data using the receipt (text-only) model configured via env.
 * Reconciles inconsistent OCR date/time fields and generates a receipt title.
 *
 * @param {Object} params
 * @param {Object} params.transactionDate - OCR TransactionDate field ({ content, valueDate })
 * @param {Object} params.transactionTime - OCR TransactionTime field ({ content, valueTime })
 * @param {string} params.merchantName - Merchant name from receipt
 * @param {Object[]} params.lineItems - Line items from OCR ({ description, quantity, totalPrice })
 * @param {string} params.originalFilename - Original upload filename
 * @param {string} params.currentDate - Today's date (YYYY-MM-DD), for the year sanity check. Passed in (not computed here) so the util stays deterministic.
 * @returns {Promise<Object>} { date, time, title, filenameIsHumanNamed }
 */
export async function normalizeReceipt ({ transactionDate, transactionTime, merchantName, lineItems, originalFilename, currentDate }) {
  const systemPrompt = loadInstructions('normalize-receipt')

  const userMessage = JSON.stringify({
    currentDate: currentDate || null,
    transactionDate: transactionDate || null,
    transactionTime: transactionTime || null,
    merchantName: merchantName || 'Unknown',
    lineItems: lineItems || [],
    originalFilename,
  }, null, 2)

  const { receiptModel } = getGatewayModels()

  const result = await llmGenerate({
    model: receiptModel,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
    schema: normalizeReceiptSchema,
    label: 'normalize',
  })

  return {
    ...result.object,
    model: result.modelId,
  }
}
