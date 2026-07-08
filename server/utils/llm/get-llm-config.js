/**
 * Get Vercel AI Gateway configuration from environment variables.
 *
 * The Gateway base URL is baked into the AI SDK's gateway provider
 * (https://ai-gateway.vercel.sh) — we only need to supply the API key.
 *
 * @returns {Object} Configuration object with the API key
 * @throws {Error} If the API key env var is missing
 */
export function getLlmConfig () {
  const apiKey = process.env.AI_GATEWAY_API_KEY

  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY environment variable is not set')
  }

  return { apiKey }
}

/**
 * Gateway model ids, sourced from env so they can be swapped without a code
 * change. Values are `provider/model` strings (e.g. 'openai/gpt-4o').
 *
 * Named by task, not modality: `annotationsModel` is the only call that sends
 * an image (so it must be multimodal); `receiptModel` serves the text-only
 * adjust-expense + normalize calls.
 *
 * @returns {{ annotationsModel: string, receiptModel: string }}
 * @throws {Error} If either model env var is missing
 */
export function getGatewayModels () {
  const annotationsModel = process.env.AI_GATEWAY_ANNOTATIONS_MODEL
  const receiptModel = process.env.AI_GATEWAY_RECEIPT_MODEL

  if (!annotationsModel) {
    throw new Error('AI_GATEWAY_ANNOTATIONS_MODEL environment variable is not set')
  }

  if (!receiptModel) {
    throw new Error('AI_GATEWAY_RECEIPT_MODEL environment variable is not set')
  }

  return { annotationsModel, receiptModel }
}
