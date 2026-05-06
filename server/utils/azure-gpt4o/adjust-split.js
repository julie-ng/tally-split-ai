import { getGpt4oConfig } from './get-gpt4o-config.js'
import { loadInstructions } from './load-instructions.js'

/**
 * Analyze OCR data and handwritten annotations to determine the adjusted split amount and payer.
 * Uses GPT-4o-mini (text-only, no vision).
 *
 * @param {Object} params
 * @param {Object} params.ocrData - Flattened OCR data from extractForLlm() ({ lineItems, total, subtotal, tax, tip })
 * @param {Object} params.annotations - Annotations JSON from GPT-4o vision analysis
 * @returns {Promise<Object>} { originalTotal, adjustedTotal, paidBy, amountConfidence, payerConfidence, reasoning }
 */
export async function adjustSplit ({ ocrData, annotations }) {
  const { endpoint, key } = getGpt4oConfig()

  const systemPrompt = loadInstructions('adjust-split')

  const userMessage = JSON.stringify({
    ocrData,
    annotations: annotations || { annotations: [], notes: 'No annotations' },
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
    throw new Error(`GPT-4o adjust-split failed (${response.status}): ${responseText}`)
  }

  const result = JSON.parse(responseText)
  const content = result.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('GPT-4o adjust-split returned empty content')
  }

  return {
    ...JSON.parse(content),
    model: result.model,
  }
}
