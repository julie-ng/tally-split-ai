import { gpt4oFetch } from './gpt4o-fetch.js'
import { loadInstructions } from './load-instructions.js'

/**
 * Normalize receipt data using GPT-4o-mini (text-only, no vision).
 * Reconciles inconsistent OCR date/time fields and generates a receipt title.
 *
 * TRIGGER.DEV-ONLY — see `gpt4o-fetch.js` for details.
 *
 * @param {Object} params
 * @param {Object} params.transactionDate - OCR TransactionDate field ({ content, valueDate })
 * @param {Object} params.transactionTime - OCR TransactionTime field ({ content, valueTime })
 * @param {string} params.merchantName - Merchant name from receipt
 * @param {Object[]} params.lineItems - Line items from OCR ({ description, quantity, totalPrice })
 * @param {string} params.originalFilename - Original upload filename
 * @returns {Promise<Object>} { date, time, title, filenameIsHumanNamed }
 */
export async function normalizeReceipt ({ transactionDate, transactionTime, merchantName, lineItems, originalFilename }) {
  const systemPrompt = loadInstructions('normalize-receipt')

  const userMessage = JSON.stringify({
    transactionDate: transactionDate || null,
    transactionTime: transactionTime || null,
    merchantName: merchantName || 'Unknown',
    lineItems: lineItems || [],
    originalFilename,
  }, null, 2)

  const result = await gpt4oFetch({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  }, 'normalize')

  const content = result.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4o normalize returned empty content')
  }

  return {
    ...JSON.parse(content),
    model: result.model,
  }
}
