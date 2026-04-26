import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const log = useLogger('token')
  await guards.requireAuthentication(event)

  /**
   * Configure Azure Storage
   */
  azureStorageUtils.useAzureStorageConfig()

  /**
   * Validate request params
   */
  const result = await readValidatedBody(event, body => zodSchemas.tokenReadRequestSchema.safeParse(body))
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

  log.info({ permissions: 'read', blobUrl, expiresAt }, 'SAS token generated')

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
