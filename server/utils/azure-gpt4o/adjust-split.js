import { getGpt4oConfig } from './get-gpt4o-config.js'

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

  const systemPrompt = `You are analyzing a receipt's OCR data alongside handwritten annotations to determine expense splitting.

You will receive:
1. Structured OCR data: line items with descriptions/prices, and receipt totals
2. Handwritten annotations detected on the receipt (initials, circles, strikethroughs)

## Your tasks

### 1. Determine the original total
Use the receipt's total from the OCR data. If the total is missing, sum the line items.

### 2. Determine the adjusted total
Apply annotation rules to calculate the adjusted amount to split:

**Circles take precedence over strikethroughs.**
- A circle around the receipt total → use that as the split amount
- Circles around specific items → sum only those items as the split amount
- If multiple circles exist and one is the receipt total, lean toward the receipt total
- Strikethroughs → remove those items from the total (only when no circles define the scope)
- Strikethroughs within a circled group → still subtract those items from the circled scope

If no annotations affect the total, the adjusted total equals the original total.

### 3. Determine who paid
- Initials next to items → those items belong to that person (exclude from shared split)
- Initials in the margin with no item association → that person paid the bill (reduce confidence)
- Multiple different initials indicate item ownership, NOT multiple payers — there is always exactly one payer
- If no initials clearly indicate a payer, set paidBy to null

### 4. Confidence scores
Provide two separate confidence scores (0.0 to 1.0):
- **amountConfidence**: how confident you are in the adjusted total
- **payerConfidence**: how confident you are in who paid

High confidence (0.8+): clear annotations, unambiguous interpretation
Medium confidence (0.5-0.8): annotations present but somewhat ambiguous
Low confidence (below 0.5): guessing based on unclear or conflicting annotations

Return JSON:
{
  "originalTotal": <number>,
  "adjustedTotal": <number>,
  "paidBy": "<initials>" or null,
  "confidence": <number 0-1>,
  "amountConfidence": <number 0-1>,
  "payerConfidence": <number 0-1>,
  "reasoning": "<1-2 sentences explaining your interpretation>"
}

Where "confidence" is your overall confidence across all fields.`

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
