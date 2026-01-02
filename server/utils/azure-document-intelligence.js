/**
 * Get Azure Document Intelligence configuration from environment variables
 * @returns {Object} Configuration object with endpoint and key
 * @throws {Error} If required environment variables are missing
 */
export function getAzureDocumentIntelligenceConfig() {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY

  if (!endpoint) {
    throw new Error('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT environment variable is not set')
  }

  if (!key) {
    throw new Error('AZURE_DOCUMENT_INTELLIGENCE_KEY environment variable is not set')
  }

  return {
    endpoint,
    key
  }
}
