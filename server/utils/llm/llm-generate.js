import { generateObject, createGateway, APICallError } from 'ai'
import { getLlmConfig } from './get-llm-config.js'

/**
 * Structured generation via the Vercel AI Gateway.
 *
 * Requests route through the Gateway (base URL baked into the SDK's gateway
 * provider). ZDR + automatic caching are applied per-call via
 * providerOptions.gateway.
 *
 * Rate-limit (429) backoff is delegated to the AI SDK's built-in retry — we
 * no longer hand-roll a `wait.for` loop. (That loop existed to be
 * trigger.dev-worker-friendly against Azure's TPM ceiling; the Gateway plus
 * the SDK's retry handle this.)
 */

// Applied to every request. ZDR is fail-closed by design (finance app):
// if no zero-data-retention provider is available for the model, the
// Gateway rejects the request rather than silently routing without ZDR.
// `caching: 'auto'` lets the Gateway manage cache breakpoints (harmless
// for providers that cache implicitly, e.g. OpenAI).
const GATEWAY_PROVIDER_OPTIONS = {
  gateway: {
    zeroDataRetention: true,
    caching: 'auto',
  },
}

/**
 * Structured error thrown by llmGenerate on failed generations.
 * Preserves the HTTP status (when available) so callers can branch.
 */
export class LlmError extends Error {
  constructor (status, body, label) {
    super(`LLM ${label} failed (${status}): ${body}`)
    this.name = 'LlmError'
    this.status = status
    this.body = body
  }
}

/**
 * Generate a structured object via the Vercel AI Gateway.
 *
 * @param {Object} params
 * @param {string} params.model - Gateway model id, e.g. 'openai/gpt-4o'
 * @param {string} params.system - System prompt (the AI SDK requires the system
 *   prompt as a dedicated option — `role: 'system'` messages are rejected).
 * @param {import('ai').ModelMessage[]} params.messages - Chat messages (user/assistant only)
 * @param {import('zod').ZodType} params.schema - Zod schema for the structured output
 * @param {string} params.label - Used in error messages, e.g. 'adjust-expense'
 * @returns {Promise<{ object: Object, usage: Object, modelId: string }>}
 * @throws {LlmError} On a failed generation (after the SDK's own retries)
 */
export async function llmGenerate ({ model, system, messages, schema, label }) {
  const { apiKey } = getLlmConfig()
  const gateway = createGateway({ apiKey })

  try {
    const result = await generateObject({
      model: gateway(model),
      system,
      messages,
      schema,
      temperature: 0,
      providerOptions: GATEWAY_PROVIDER_OPTIONS,
    })

    return {
      object: result.object,
      usage: result.usage,
      modelId: result.response?.modelId ?? model,
    }
  }
  catch (err) {
    const status = APICallError.isInstance(err) ? err.statusCode : undefined
    console.error('[llm generate failed]', { label, status, message: err.message })
    throw new LlmError(status ?? 'unknown', err.message, label)
  }
}
