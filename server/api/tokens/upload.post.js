import { z } from 'zod'

const requestSchema = (userId) => {
  return z.object({
    action: z.string().refine(value => value === 'create', { error: 'Invalid action' }),
    blobPath: z.string().refine(value => value.startsWith(userId), { error: 'Blob path must start with user Id' }),
  })
}

export default defineEventHandler(async (event) => {
  const log = useLogger('token')
  // ⚠️ TODO - implement security.
  await guards.requireAuthentication(event)
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
  const { blobPath } = result.data

  /**
   * Generate SAS token
   * Valid: 1 minute
   */
  const { blobUrl, uploadUrl, expiresAt } = azureStorageUtils.generateBlobSasToken(blobPath, {
    permissions: 'create',
    expiresInMinutes: 1,
  })

  log.info({ permissions: 'create', blobUrl, expiresAt }, 'SAS token generated')

  return {
    blob: {
      path: blobPath,
      url: blobUrl,
    },
    upload: {
      url: uploadUrl,
      expiresAt,
    },
  }
})
