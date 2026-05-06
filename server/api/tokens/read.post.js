import { z } from 'zod'
import { eq, or } from 'drizzle-orm'

/**
 * Issues a 5-minute SAS read URL for a blob (or thumbnail). Storage account
 * key never leaves the server — Trigger.dev workers call this endpoint
 * instead of generating SAS locally.
 *
 * Dual-auth, with separate AuthZ paths because the resource here is a
 * capability ("read this blob"), not one of the standard household
 * resources (upload/receipt/split). requireAuthorization is unsuitable —
 * its task path checks `workflowRun.upload.id` against a passed
 * uploadId, but our request is keyed by blobName. Special-case AuthZ
 * is inlined below.
 *
 * - User principal: blob's upload must be in the user's household
 * - Task principal: blob's upload.id must equal workflowRun.upload.id
 *   AND task must hold the `token:read` action
 */
export default defineEventHandler(async (event) => {
  const log = useLogger('token')
  const db = useDB()
  await guards.requireAuthentication(event)

  azureStorageUtils.useAzureStorageConfig()

  /**
   * Validate request body
   */
  const rawBody = await readBody(event).catch(() => null)
  const result = zodSchemas.tokenReadRequestSchema.safeParse(rawBody)
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors
    log.warn({ body: rawBody, errors }, 'Invalid request body for SAS read token')
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors,
    }
  }
  const { action, blobName } = result.data

  /**
   * Resolve the upload that owns this blob (matches original blob OR thumbnail).
   */
  const [upload] = await db
    .select({
      id: schema.uploads.id,
      householdId: schema.uploads.householdId,
    })
    .from(schema.uploads)
    .where(or(
      eq(schema.uploads.blobName, blobName),
      eq(schema.uploads.thumbnailName, blobName),
    ))
    .limit(1)

  if (!upload) {
    logSecurityEvent(event, 'warn', { blobName, reason: 'blob_not_found' }, 'Authorization denied')
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  /**
   * AuthZ — special-case because the resource is a capability, not a
   * standard household resource. See file-level docblock.
   */
  const isTask = !!event.context.workflowRun
  if (isTask) {
    const taskActions = event.context.taskActions ?? []
    const expectedUploadId = event.context.workflowRun.upload?.id

    if (!taskActions.includes('token:read')) {
      logSecurityEvent(event, 'warn', {
        taskId: event.context.taskId,
        granted: taskActions,
        reason: 'token_read_not_granted',
      }, 'Task permission denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }

    if (upload.id !== expectedUploadId) {
      logSecurityEvent(event, 'warn', {
        taskId: event.context.taskId,
        blobName,
        uploadId: upload.id,
        expected: expectedUploadId,
        reason: 'blob_outside_workflow_scope',
      }, 'Authorization denied')
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
  }
  else {
    const householdId = event.context.householdId
    if (upload.householdId !== householdId) {
      logSecurityEvent(event, 'warn', { userId: event.context.userId, householdId, blobName, reason: 'blob_not_household_member' }, 'Authorization denied')
      throw createError({ statusCode: 404, message: 'Not found' })
    }
  }

  /**
   * Generate SAS Token (read-only, 5 minute validity)
   */
  const {
    blobUrl,
    sasToken,
    uploadUrl,
    expiresAt,
  } = azureStorageUtils.generateBlobSasToken(blobName, {
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
