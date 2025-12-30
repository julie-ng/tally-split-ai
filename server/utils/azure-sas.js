import {
	StorageSharedKeyCredential,
	BlobSASPermissions,
	generateBlobSASQueryParameters
} from '@azure/storage-blob'

/**
 * Get Azure Storage configuration from environment variables
 * @returns {Object} Configuration object with account, container, and key
 * @throws {Error} If configuration is missing
 */
export function getAzureStorageConfig() {
	const config = {
		account: process.env.AZ_STORAGE_ACCOUNT,
		container: process.env.AZ_STORAGE_CONTAINER_NAME,
		accountKey: process.env.AZ_STORAGE_ACCOUNT_KEY
	}

	if (!config.account || !config.container || !config.accountKey) {
		throw new Error('Azure Storage configuration is missing')
	}

	return config
}

/**
 * Generate blob URL
 * @param {string} blobName - The blob name/path
 * @returns {string} Full blob URL
 */
export function generateBlobUrl(blobName) {
	const { account, container } = getAzureStorageConfig()
	return `https://${account}.blob.core.windows.net/${container}/${blobName}`
}

/**
 * Generate SAS token for Azure Blob Storage
 * @param {string} blobName - The blob name/path
 * @param {Object} options - SAS token options
 * @param {string} options.permissions - Permissions: 'read', 'create', or 'write'
 * @param {number} options.expiresInMinutes - Token validity duration in minutes
 * @returns {Object} Object containing sasToken, blobUrl, uploadUrl, and expiresAt
 */
export function generateBlobSasToken(blobName, { permissions = 'read', expiresInMinutes = 5 } = {}) {
	const { account, container, accountKey } = getAzureStorageConfig()

	// Create shared key credential
	const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey)

	// Set permissions
	const sasPermissions = new BlobSASPermissions()

	switch (permissions) {
		case 'read':
			sasPermissions.read = true
			break
		case 'create':
			sasPermissions.create = true
			break
		case 'write':
			sasPermissions.create = true
			sasPermissions.write = true
			break
		default:
			throw new Error(`Invalid permission: ${permissions}. Must be 'read', 'create', or 'write'`)
	}

	// Set expiration time
	const startsOn = new Date()
	const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000)

	// Generate SAS token
	const sasToken = generateBlobSASQueryParameters(
		{
			containerName: container,
			blobName: blobName,
			permissions: sasPermissions,
			startsOn: startsOn,
			expiresOn: expiresOn
		},
		sharedKeyCredential
	).toString()

	const blobUrl = generateBlobUrl(blobName)

	return {
		sasToken,
		blobUrl,
		uploadUrl: `${blobUrl}?${sasToken}`,
		expiresAt: expiresOn.toISOString()
	}
}
