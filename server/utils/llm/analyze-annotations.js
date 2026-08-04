import { llmGenerate } from './llm-generate.js'
import { loadInstructions } from './load-instructions.js'
import { annotationsSchema } from './schemas.js'
import { getGatewayModels } from './get-llm-config.js'

/**
 * Analyze a receipt image for handwritten annotations. Uses the annotations
 * (multimodal) model configured via env.
 *
 * @param {string} imageUrl - Fully qualified image URL (with SAS token)
 * @param {Object[]} ocrLineItems - Line items extracted by Document Intelligence
 * @param {string|null} [customInstructions] - Optional household-level guidance appended to system prompt
 * @returns {Promise<Object>} LLM response with annotation data
 */
export async function analyzeAnnotations (imageUrl, ocrLineItems, customInstructions = null) {
  const baseSystemPrompt = loadInstructions('analyze-annotations')
  const systemPrompt = customInstructions
    ? `${baseSystemPrompt}\n\n## Custom Household Instructions\nThe household has provided the following guidance for this analysis. Apply where relevant; ignore if not applicable to this receipt:\n\n${customInstructions}`
    : baseSystemPrompt

  // Number the items explicitly. The model reports `lineItemIndex` against
  // these — serializing a bare array would force it to count positions itself,
  // which is exactly the arithmetic it gets wrong.
  const indexedLineItems = ocrLineItems.map((item, index) => ({ index, ...item }))

  const userMessage = `Here are the line items from OCR:\n${JSON.stringify(indexedLineItems, null, 2)}\n\nPlease analyze the receipt image for handwritten annotations.`

  console.log(`🔍 Calling LLM for handwritten annotations analysis`)
  console.log(`   Image URL: ${imageUrl}`)

  const { annotationsModel } = getGatewayModels()

  const result = await llmGenerate({
    model: annotationsModel,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'file', mediaType: 'image', data: imageUrl },
        ],
      },
    ],
    schema: annotationsSchema,
    label: 'annotations analysis',
  })

  // Rebuild the `{ raw, annotations }` shape that slimAnnotationsResponse
  // expects. The AI SDK returns a normalized result (not the OpenAI
  // envelope), so we synthesize a `raw` with just the fields the slim util
  // reads: model + usage (mapped to the prompt/completion/total token names).
  const raw = {
    model: result.modelId,
    usage: {
      prompt_tokens: result.usage?.inputTokens ?? null,
      completion_tokens: result.usage?.outputTokens ?? null,
      total_tokens: result.usage?.totalTokens ?? null,
    },
  }

  return {
    raw,
    annotations: result.object,
  }
}
