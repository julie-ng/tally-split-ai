import { z } from 'zod'

const requestSchema = (userId) => {
  return z.object({
    action: z.string().refine(value => value === 'read', { error: 'Invalid action' }),
    blobName: z.string().includes(userId, { error: 'Blob name must include user Id' }),
  })
}

export default defineEventHandler(async (event) => {
  // ⚠️ TODO - implement security.
  requireUserId(event)
  const userId = event.context.userId

  /**
   * Configure Azure Storage
   */
  azureStorageUtils.useAzureStorageConfig()

  /**
   * Validate request params
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
  const { action, blobName } = result.data

  /**
   * Generate SAS Token
   * with read-only permissions (5 minutes validity)
   */
  const {
    blobUrl,
    sasToken,
    uploadUrl,
    expiresAt,
  } = azureStorageUtils.generateBlobSasToken(blobName,
    {
      permissions: 'read',
      expiresInMinutes: 5,
    })

  return {
    success: true,
    action: action,
    blobName: blobName,
    blobUrl,
    sasToken,
    blobUrlWithSas: uploadUrl,
    expiresAt,
  }
})
