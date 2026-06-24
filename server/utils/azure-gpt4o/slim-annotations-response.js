/**
 * Slim the GPT-4o annotation-detection response to only the fields we need.
 *
 * Drops the raw API envelope (choices, full message, system_fingerprint, etc.)
 * and flattens the nested `annotations.annotations` / `annotations.notes` shape.
 * Keeps the model id, token usage, the annotations array, and notes.
 *
 * Accepts either:
 *   - The fresh response from `analyzeAnnotations`:
 *       { raw: <full GPT response>, annotations: { annotations: [...], notes } }
 *   - An already-slimmed object (idempotent — returns an equivalent shape):
 *       { model, usage, annotations: [...], notes }
 *
 * @param {Object} response - GPT-4o annotation response (raw or already slimmed)
 * @returns {Object|null} Slimmed { model, usage, annotations, notes }
 */
export function slimAnnotationsResponse (response) {
  if (!response) return response

  // Already-slimmed input: `annotations` is the array itself (no `raw` envelope).
  if (!response.raw && Array.isArray(response.annotations)) {
    return {
      model: response.model ?? null,
      usage: response.usage ?? null,
      annotations: response.annotations,
      notes: response.notes ?? null,
    }
  }

  const raw = response.raw
  const inner = response.annotations

  return {
    model: raw?.model ?? null,
    usage: raw?.usage
      ? {
          prompt_tokens: raw.usage.prompt_tokens,
          completion_tokens: raw.usage.completion_tokens,
          total_tokens: raw.usage.total_tokens,
        }
      : null,
    annotations: inner?.annotations ?? [],
    notes: inner?.notes ?? null,
  }
}
