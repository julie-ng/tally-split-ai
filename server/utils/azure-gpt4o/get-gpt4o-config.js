/**
 * Get Azure GPT-4o configuration from environment variables.
 * @returns {Object} Configuration object with endpoint and key
 * @throws {Error} If required environment variables are missing
 */
export function getGpt4oConfig () {
  const endpoint = process.env.AZURE_FOUNDRY_GPT4O_ENDPOINT
  const key = process.env.AZURE_FOUNDRY_GPT4O_KEY

  if (!endpoint) {
    throw new Error('AZURE_FOUNDRY_GPT4O_ENDPOINT environment variable is not set')
  }

  if (!key) {
    throw new Error('AZURE_FOUNDRY_GPT4O_KEY environment variable is not set')
  }

  return { endpoint, key }
}
