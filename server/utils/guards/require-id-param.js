/**
 * Validates an opaque id route parameter (nanoid format: 18 chars,
 * lowercase + digits). Used by all public-facing routes — households,
 * users, uploads, receipts, splits.
 *
 * Throws 400 error if invalid.
 *
 * @param {H3Event} event
 * @param {string} paramName - Route parameter name (default: 'id')
 */
export function requireIdParam (event, paramName = 'id') {
  const id = getRouterParam(event, paramName)
  const result = zodSchemas.idParamSchema.safeParse({ id })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid or missing ${paramName} parameter`,
    })
  }
}
