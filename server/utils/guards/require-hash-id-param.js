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
