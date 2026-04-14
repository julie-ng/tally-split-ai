/**
 * Get Azure Storage configuration from environment variables.
 * @returns {Object} Configuration object with account, container, and key
 * @throws {Error} If configuration is missing
 */
export function useAzureStorageConfig () {
  const config = {
    account: process.env.AZ_STORAGE_ACCOUNT,
    container: process.env.AZ_STORAGE_CONTAINER_NAME,
    accountKey: process.env.AZ_STORAGE_ACCOUNT_KEY,
  }

  if (!config.account || !config.container || !config.accountKey) {
    throw new Error('Azure Storage configuration is missing')
  }

  return config
}
