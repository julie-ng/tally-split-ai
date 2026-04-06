import { Mistral } from '@mistralai/mistralai'

/**
 * Get Mistral API key from environment variables
 * @returns {string} API key
 * @throws {Error} If MISTRAL_AI_API_KEY is not set
 */
function getMistralApiKey () {
  const apiKey = process.env.MISTRAL_AI_API_KEY

  if (!apiKey) {
    throw new Error('MISTRAL_AI_API_KEY environment variable is not set')
  }

  return apiKey
}

/**
 * Analyze a receipt image using the Mistral OCR model
 * @param {string} imageUrl - Fully qualified image URL (with SAS token if needed)
 * @returns {Promise<Object>} Parsed OCR response from Mistral
 */
async function analyzeImage (imageUrl) {
  const apiKey = getMistralApiKey()
  const { mistralOcrModel } = useRuntimeConfig()

  const client = new Mistral({ apiKey })

  console.log(`🔍 Calling Mistral OCR (model: ${mistralOcrModel})`)
  console.log(`   Image URL: ${imageUrl}`)

  const response = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: {
      // type: 'image_url',
      documentUrl: imageUrl,
    },
    extractHeader: true,
    extractFooter: true,
    // tableFormat: 'html',
    includeImageBase64: false,
    bboxAnnotationFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: 'receipt_annotations',
        strict: true,
        schemaDefinition: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text content of this region' },
            is_handwritten: { type: 'boolean', description: 'Whether this text is handwritten' },
            label: { type: 'string', description: 'Category: printed_text, handwritten_initial, handwritten_annotation, circle, strikethrough, or other' },
          },
          required: ['text', 'is_handwritten', 'label'],
          additionalProperties: false,
        },
      },
    },
    // bboxAnnotationFormat: {
    //   type: 'json_schema',
    //   jsonSchema: {
    //     name: 'HandwritingDetection',
    //     schemaDefinition: {
    //       type: 'object',
    //       properties: {
    //         label: {
    //           type: 'string',
    //           enum: ['printed_text', 'handwriting', 'signature'],
    //         },
    //         text_content: { type: 'string' },
    //         bbox: {
    //           type: 'array',
    //           items: { type: 'number' },
    //           minItems: 4,
    //           maxItems: 4,
    //           description: '[ymin, xmin, ymax, xmax] normalized 0-1000',
    //         },
    //       },
    //       required: ['label', 'text_content', 'bbox'],
    //     },
    //   },
    // },
    // bboxAnnotationFormat: 'text',
  })

  return response
}

export const mistralOcrUtils = {
  analyzeImage,
}
