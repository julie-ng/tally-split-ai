export default defineEventHandler(async (event) => {
	// Validate environment variables
	try {
		getAzureStorageConfig()
	} catch (error) {
		throw createError({
			statusCode: 500,
			message: error.message
		})
	}

	const body = await readBody(event)

	// Validate request body
	if (!body || typeof body !== 'object') {
		throw createError({
			statusCode: 400,
			message: 'Invalid request body.'
		})
	}

	const { action, blobName } = body

	// Validate action
	if (action !== 'read') {
		throw createError({
			statusCode: 400,
			message: 'Invalid action.'
		})
	}

	// Validate blobName
	if (!blobName || typeof blobName !== 'string') {
		throw createError({
			statusCode: 400,
			message: 'Invalid blobName. Must be a non-empty string'
		})
	}

	/**
	 * ⚠️ No security implemented. For local DEMO only.
	 * In production scenario, need some authentication
	 * and authorization before generating a token, that
	 * should also be user-specific (e.g. via URL, and
	 * own database check).
	 */

	// Generate SAS token with read-only permissions (5 minutes validity)
	const { blobUrl, sasToken, uploadUrl, expiresAt } = generateBlobSasToken(blobName, {
		permissions: 'read',
		expiresInMinutes: 5
	})

	return {
		success: true,
		action,
		blobName,
		blobUrl,
		sasToken,
		blobUrlWithSas: uploadUrl,
		expiresAt
	}
})
