/**
 * Validates id route parameter.
 * Throws 400 error if invalid.
 *
 * @param {H3Event} event
 */
export function requireIdParam (event) {
  const id = getRouterParam(event, 'id')
  const result = zodSchemas.idParamSchema.safeParse({ id })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or missing id parameter',
    })
  }
}
