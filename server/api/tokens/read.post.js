import { z } from 'zod'
import { eq, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger('token')
  const db = useDB()
  await guards.requireAuthentication(event)
  const householdId = event.context.householdId

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
   * AuthZ: verify the blob belongs to an upload owned by this user's household.
   * blobName may match either the original or the thumbnail.
   */
  const [upload] = await db
    .select({ householdId: schema.uploads.householdId })
    .from(schema.uploads)
    .where(or(
      eq(schema.uploads.blobName, blobName),
      eq(schema.uploads.thumbnailName, blobName),
    ))
    .limit(1)

  if (!upload || upload.householdId !== householdId) {
    logSecurityEvent(event, 'warn', { householdId, blobName, reason: 'blob_not_household_member' }, 'Authorization denied')
    throw createError({ statusCode: 404, message: 'Not found' })
  }

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
