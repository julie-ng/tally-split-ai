import { z } from 'zod'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDB()
  await guards.requireAuthentication(event)
  guards.requireTaskPermission(event)
  guards.requireIdParam(event)

  const id = getRouterParam(event, 'id')
  await guards.requireAuthorization(event, { uploadId: id })

  const result = await readValidatedBody(event, body => zodSchemas.uploadUpdateSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.flattenError(result.error).fieldErrors,
    }
  }

  // AuthZ: if relinking to a different receipt, verify principal owns it
  if (result.data.receiptId) {
    await guards.requireAuthorization(event, { receiptId: result.data.receiptId })
  }

  const updates = {
    ...result.data,
    updatedAt: new Date(),
  }

  // Drizzle's timestamp column expects a Date object, not an ISO string
  if (updates.uploadedAt) {
    updates.uploadedAt = new Date(updates.uploadedAt)
  }

  const dbResult = await db
    .update(schema.uploads)
    .set(updates)
    .where(eq(schema.uploads.id, id))
    .returning()

  if (dbResult.length === 0) {
    throw createError({
      statusCode: 404,
      message: `Upload with id '${id}' not found`,
    })
  }

  // Acknowledgment only — do not return the row. A write-scoped token must not
  // gain an incidental read of the full upload. The client re-fetches.
  return { success: true }
})
