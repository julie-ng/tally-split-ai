import { getGpt4oConfig } from './get-gpt4o-config.js'
import { loadInstructions } from './load-instructions.js'

/**
 * Normalize receipt data using GPT-4o-mini (text-only, no vision).
 * Reconciles inconsistent OCR date/time fields and generates a receipt title.
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
  const { endpoint, key } = getGpt4oConfig()

  const systemPrompt = loadInstructions('normalize-receipt')

  const userMessage = JSON.stringify({
    transactionDate: transactionDate || null,
    transactionTime: transactionTime || null,
    merchantName: merchantName || 'Unknown',
    lineItems: lineItems || [],
    originalFilename,
  }, null, 2)

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    })
  }
  catch (err) {
    console.error('[gpt4o fetch failed]', {
      endpoint,
      cause: err.cause?.message,
      code: err.cause?.code,
      hostname: err.cause?.hostname,
    })
    throw err
  }

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`GPT-4o normalize failed (${response.status}): ${responseText}`)
  }

  const result = JSON.parse(responseText)
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('GPT-4o normalize returned empty content')
  }

  return {
    ...JSON.parse(content),
    model: result.model,
  }
}
