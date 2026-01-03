import { z } from 'zod'

export default defineEventHandler(async (event) => {
  // ⚠️ TODO - implement security.
  requireUserId(event)
  const userId = event.context.userId

  const requestSchema = z.object({
    action: z.string().refine((value) => value === 'read', { error: 'Invalid action' }),
    blobName: z.string().includes(userId, { error: 'Blob name must include user Id' })
  })

  // Validate environment variables
  try {
    azureStorageUtils.getAzureStorageConfig()
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  const result = await readValidatedBody(event, body => requestSchema.safeParse(body))

  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: "Invalid request body",
      errors: z.flattenError(result.error).fieldErrors
    }
  }

  // Generate SAS token with read-only permissions (5 minutes validity)
  const {
    blobUrl,
    sasToken,
    uploadUrl,
    expiresAt
  } = azureStorageUtils.generateBlobSasToken(result.data.blobName,
    {
      permissions: 'read',
      expiresInMinutes: 5
    })

  return {
    success: true,
    action: result.data.action,
    blobName: result.data.blobName,
    blobUrl,
    sasToken,
    blobUrlWithSas: uploadUrl,
    expiresAt
  }

})
