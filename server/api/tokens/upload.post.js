import { z } from 'zod'

const requestSchema = (userId) => {
  return z.object({
    action: z.string().refine(value => value === 'create', { error: 'Invalid action' }),
    blobName: z.string().includes(userId, { error: 'Blob name must include user Id' }),
  })
}

export default defineEventHandler(async (event) => {
  // ⚠️ TODO - implement security.
  requireUserId(event)
  const userId = event.context.userId

  azureStorageUtils.useAzureStorageConfig()

  /**
   * Validate Request
   */
  const result = await readValidatedBody(event, body => requestSchema(userId).safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }
  const { blobName } = result.data

  /**
   * Generate SAS token
   * Valid: 1 minute
   */
  const { blobUrl, uploadUrl, expiresAt } = azureStorageUtils.generateBlobSasToken(blobName, {
    permissions: 'create',
    expiresInMinutes: 1,
  })

  return {
    blob: {
      name: blobName,
      url: blobUrl,
    },
    upload: {
      url: uploadUrl,
      expiresAt,
    },
  }
})
