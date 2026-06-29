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
 * @param {Array<{firstName: string|null, initials: string|null}>} [params.householdMembers] - The two household members in slot order (user1, user2). Lets the model map handwriting → a person and allocate shares + payer by slot. Empty/absent when the household hasn't consented.
 * @returns {Promise<Object>} { originalTotal, adjustedTotal, shares, paidBy, confidence, amountConfidence, shareConfidence, payerConfidence, reasoning }
 */
export async function adjustExpense ({ ocrData, ocrText = null, annotations, customInstructions = null, householdMembers = [] }) {
  const baseSystemPrompt = loadInstructions('adjust-expense')
  const systemPrompt = customInstructions
    ? `${baseSystemPrompt}\n\n## Custom Household Instructions\nThe household has provided the following guidance for this analysis. Apply where relevant; ignore if not applicable to this receipt:\n\n${customInstructions}`
    : baseSystemPrompt

  // Present the two members keyed by slot so the model returns shares + payer as
  // 'user1'/'user2' (the server maps slot → userId — PII boundary: no userIds
  // are ever sent here, only first name + initials).
  const household = {
    user1: householdMembers[0] ?? null,
    user2: householdMembers[1] ?? null,
  }

  const userMessage = JSON.stringify({
    ocrData,
    ocrText,
    annotations: annotations || { annotations: [], notes: 'No annotations' },
    household,
  }, null, 2)

  const result = await gpt4oFetch({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  }, 'adjust-expense')

  const content = result.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4o adjust-expense returned empty content')
  }

  return {
    ...JSON.parse(content),
    model: result.model,
  }
}
