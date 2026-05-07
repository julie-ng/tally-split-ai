import { wait } from '@trigger.dev/sdk/v3'
import { getGpt4oConfig } from './get-gpt4o-config.js'

/**
 * NOTE: TRIGGER.DEV-ONLY.
 *
 * This module uses `wait.for` from `@trigger.dev/sdk/v3` for non-blocking,
 * checkpointed sleeps during 429 backoff. `wait.for` only works inside a
 * trigger task run — calling it outside that runtime will throw.
 *
 * That makes every export here (and every gpt4o util that calls into
 * `gpt4oFetch` — `adjust-split.js`, `analyze-annotations.js`,
 * `normalize-receipt.js`) safe to use from `trigger/**` only. Do NOT
 * import these from Nuxt API handlers, server middleware, scripts, or
 * tests.
 */

/**
 * Structured error thrown by gpt4oFetch on non-2xx responses.
 * Preserves the HTTP status, response headers, and body so callers
 * can branch on `err.status === 429` etc.
 */
export class Gpt4oError extends Error {
  constructor (status, headers, body, label) {
    super(`GPT-4o ${label} failed (${status}): ${body}`)
    this.name = 'Gpt4oError'
    this.status = status
    this.headers = headers
    this.body = body
  }
}

const MAX_RETRIES_ON_429 = 2 // 2 internal retries on top of trigger.dev's outer maxAttempts
const DEFAULT_RETRY_AFTER_SECONDS = 30
const JITTER_RANGE_SECONDS = 5

/**
 * POST to the configured GPT-4o endpoint with internal retry-on-429
 * using `wait.for` (non-blocking, checkpointed by trigger.dev — does not
 * occupy a worker during the wait).
 *
 * Reads Azure's `Retry-After` header when present; falls back to a
 * 30s default plus 0–4s jitter to avoid lockstep retries when
 * multiple concurrent uploads all hit the TPM ceiling at once.
 *
 * @param {Object} requestBody - The OpenAI-shape request body
 * @param {string} label - Used in error messages, e.g. 'adjust-split'
 * @returns {Promise<Object>} The parsed response JSON
 * @throws {Gpt4oError} On non-2xx responses after retries are exhausted
 */
export async function gpt4oFetch (requestBody, label) {
  const { endpoint, key } = getGpt4oConfig()

  for (let attempt = 0; attempt <= MAX_RETRIES_ON_429; attempt += 1) {
    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': key,
        },
        body: JSON.stringify(requestBody),
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

    if (response.ok) {
      return JSON.parse(responseText)
    }

    if (response.status !== 429 || attempt === MAX_RETRIES_ON_429) {
      throw new Gpt4oError(
        response.status,
        Object.fromEntries(response.headers),
        responseText,
        label,
      )
    }

    // 429 with retries left — wait for Retry-After + jitter, then loop.
    const retryAfter = parseInt(response.headers.get('retry-after') ?? '', 10)
    const baseSeconds = Number.isFinite(retryAfter) ? retryAfter : DEFAULT_RETRY_AFTER_SECONDS
    const jitterSeconds = Math.floor(Math.random() * JITTER_RANGE_SECONDS)
    const totalSeconds = baseSeconds + jitterSeconds

    console.log(`[gpt4o ${label}] 429 received, attempt ${attempt + 1}/${MAX_RETRIES_ON_429 + 1}; waiting ${totalSeconds}s before retry`)
    await wait.for({ seconds: totalSeconds })
  }
}
