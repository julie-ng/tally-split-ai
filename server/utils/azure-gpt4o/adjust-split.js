import { gpt4oFetch } from './gpt4o-fetch.js'
import { loadInstructions } from './load-instructions.js'

/**
 * Analyze OCR data and handwritten annotations to determine the adjusted split amount and payer.
 * Uses GPT-4o-mini (text-only, no vision).
 *
 * TRIGGER.DEV-ONLY — see `gpt4o-fetch.js` for details.
 *
 * @param {Object} params
 * @param {Object} params.ocrData - Flattened OCR data from extractForLlm() ({ lineItems, total, subtotal, tax, tip })
 * @param {string|null} [params.ocrText] - Full raw OCR text. Useful for matching things the receipt model misses (e.g., card numbers in the footer).
 * @param {Object} params.annotations - Annotations JSON from GPT-4o vision analysis
 * @param {string|null} [params.customInstructions] - Optional household-level guidance appended to system prompt
 * @returns {Promise<Object>} { originalTotal, adjustedTotal, paidBy, amountConfidence, payerConfidence, reasoning }
 */
export async function adjustSplit ({ ocrData, ocrText = null, annotations, customInstructions = null }) {
  const baseSystemPrompt = loadInstructions('adjust-split')
  const systemPrompt = customInstructions
    ? `${baseSystemPrompt}\n\n## Custom Household Instructions\nThe household has provided the following guidance for this analysis. Apply where relevant; ignore if not applicable to this receipt:\n\n${customInstructions}`
    : baseSystemPrompt

  const userMessage = JSON.stringify({
    ocrData,
    ocrText,
    annotations: annotations || { annotations: [], notes: 'No annotations' },
  }, null, 2)

  const result = await gpt4oFetch({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  }, 'adjust-split')

  const content = result.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4o adjust-split returned empty content')
  }

  return {
    ...JSON.parse(content),
    model: result.model,
  }
}
