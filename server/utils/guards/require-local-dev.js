export function requireLocalDev (event) {
  const config = useRuntimeConfig()

  if (config.public.environment !== 'development') {
    throw createError({
      statusCode: 403,
      message: 'This endpoint is only available in development',
    })
  }

  const host = getRequestHost(event, { xForwardedHost: false })
  const isLocalhost = host === 'localhost' || host.startsWith('localhost:') || host.startsWith('127.0.0.1')

  if (!isLocalhost) {
    throw createError({
      statusCode: 403,
      message: 'This endpoint is only accessible from localhost',
    })
  }
}
