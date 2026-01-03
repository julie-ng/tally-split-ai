/**
 * Adds User ID to request context.
 * Temporarily hard code for now.
 *
 * @param {H3Event} event
 */
export function requireUserId(event) {
  const config = useRuntimeConfig()

  // ⚠️ TODO
  const userId = config.public.environment === 'development'
    ? config.public.demoUserId
    : null

  if (userId === null) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Development configuration error',
      message: 'NUXT_PUBLIC_DEMO_USER_ID environment variable is required in development'
    })
  }
  event.context.userId = userId
}
