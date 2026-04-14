/**
 * Validates hashId route parameter.
 * Throws 400 error if invalid.
 *
 * @param {H3Event} event
 * @param {string} paramName - Route parameter name (default: 'hashId')
 */
export function requireHashIdParam (event, paramName = 'hashId') {
  const hashId = getRouterParam(event, paramName)
  const result = zodSchemas.hashIdParamSchema.safeParse({ hashId })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid or missing ${paramName} parameter`,
    })
  }
}
