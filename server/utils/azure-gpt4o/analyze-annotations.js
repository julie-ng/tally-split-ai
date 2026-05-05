import { getGpt4oConfig } from './get-gpt4o-config.js'

/**
 * Analyze a receipt image for handwritten annotations using GPT-4o.
 * @param {string} imageUrl - Fully qualified image URL (with SAS token)
 * @param {Object[]} ocrLineItems - Line items extracted by Document Intelligence
 * @returns {Promise<Object>} GPT-4o response with annotation data
 */
export async function analyzeAnnotations (imageUrl, ocrLineItems) {
  const { endpoint, key } = getGpt4oConfig()

  const systemPrompt = `You are analyzing a receipt photo that has handwritten annotations.
You will receive the receipt image and a list of line items already extracted by OCR.

Carefully scan the ENTIRE image for handwritten marks. Initials or annotations may appear:
- Next to specific line items
- In the margins (top, bottom, sides)
- Between line items
- Multiple times on the same receipt

Look for and identify ALL instances of:
1. Handwritten initials (e.g. "JN", "MM") — report EVERY occurrence, even if the same initials appear multiple times
2. Circled items — a circle may span multiple line items, list all items it covers
3. Struck-through items
4. Any other handwritten marks or annotations

Return JSON in this format:
{
  "annotations": [
    { "item": "Caesar Salad", "type": "initials", "value": "JN", "location": "next to item" },
    { "item": null, "type": "initials", "value": "JN", "location": "top right corner" },
    { "item": "Pizza", "type": "circle" },
    { "item": "Dessert", "type": "strikethrough" }
  ],
  "notes": "Any additional observations about the handwriting"
}

Important:
- Do NOT skip any handwritten marks. Report every single one.
- If initials appear in the margins with no specific item, set "item" to null and describe the location.
- If a circle or mark spans multiple items, create a separate annotation for each item it covers.
- If there are no handwritten annotations, return { "annotations": [], "notes": "No handwriting detected" }.`

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
