/**
 * Validates id route parameter as a UUID.
 * Throws 400 error if invalid.
 *
 * Used by routes whose primary key is a UUID (households, users).
 * Counterpart to requireIdParam (numeric IDs — receipts, splits, uploads).
 *
 * @param {H3Event} event
 */
export function requireUuidParam (event) {
  const id = getRouterParam(event, 'id')
  const result = zodSchemas.uuidParamSchema.safeParse({ id })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or missing id parameter',
    })
  }
}
