import { gpt4oFetch } from './gpt4o-fetch.js'
import { loadInstructions } from './load-instructions.js'

/**
 * Analyze a receipt image for handwritten annotations using GPT-4o.
 *
 * TRIGGER.DEV-ONLY — see `gpt4o-fetch.js` for details.
 *
 * @param {string} imageUrl - Fully qualified image URL (with SAS token)
 * @param {Object[]} ocrLineItems - Line items extracted by Document Intelligence
 * @param {string|null} [customInstructions] - Optional household-level guidance appended to system prompt
 * @returns {Promise<Object>} GPT-4o response with annotation data
 */
export async function analyzeAnnotations (imageUrl, ocrLineItems, customInstructions = null) {
  const baseSystemPrompt = loadInstructions('analyze-annotations')
  const systemPrompt = customInstructions
    ? `${baseSystemPrompt}\n\n## Custom Household Instructions\nThe household has provided the following guidance for this analysis. Apply where relevant; ignore if not applicable to this receipt:\n\n${customInstructions}`
    : baseSystemPrompt

  const userMessage = `Here are the line items from OCR:\n${JSON.stringify(ocrLineItems, null, 2)}\n\nPlease analyze the receipt image for handwritten annotations.`

  console.log(`🔍 Calling GPT-4o for handwritten annotations analysis`)
  console.log(`   Image URL: ${imageUrl}`)

  const result = await gpt4oFetch({
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  }, 'annotations analysis')

  const content = result.choices?.[0]?.message?.content

  return {
    raw: result,
    annotations: content ? JSON.parse(content) : null,
  }
}
