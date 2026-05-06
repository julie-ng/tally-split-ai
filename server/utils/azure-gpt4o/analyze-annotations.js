import { getGpt4oConfig } from './get-gpt4o-config.js'
import { loadInstructions } from './load-instructions.js'

/**
 * Analyze a receipt image for handwritten annotations using GPT-4o.
 * @param {string} imageUrl - Fully qualified image URL (with SAS token)
 * @param {Object[]} ocrLineItems - Line items extracted by Document Intelligence
 * @param {string|null} [customInstructions] - Optional household-level guidance appended to system prompt
 * @returns {Promise<Object>} GPT-4o response with annotation data
 */
export async function analyzeAnnotations (imageUrl, ocrLineItems, customInstructions = null) {
  const { endpoint, key } = getGpt4oConfig()

  const baseSystemPrompt = loadInstructions('analyze-annotations')
  const systemPrompt = customInstructions
    ? `${baseSystemPrompt}\n\n## Custom Household Instructions\nThe household has provided the following guidance for this analysis. Apply where relevant; ignore if not applicable to this receipt:\n\n${customInstructions}`
    : baseSystemPrompt

  const userMessage = `Here are the line items from OCR:\n${JSON.stringify(ocrLineItems, null, 2)}\n\nPlease analyze the receipt image for handwritten annotations.`

  console.log(`🔍 Calling GPT-4o for handwritten annotations analysis`)
  console.log(`   Image URL: ${imageUrl}`)

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
    console.error(`❌ GPT-4o error (${response.status}):`, responseText)
    throw new Error(`GPT-4o annotations analysis failed (${response.status}): ${responseText}`)
  }

  const result = JSON.parse(responseText)
  const content = result.choices?.[0]?.message?.content

  return {
    raw: result,
    annotations: content ? JSON.parse(content) : null,
  }
}
