/**
 * GET /api/realtime/token
 *
 * Mints a short-lived Supabase Realtime access JWT for the logged-in user.
 * The client passes it to `supabase.realtime.setAuth(token)` so the Realtime
 * websocket authenticates. See docs/REALTIME.md and
 * server/utils/realtime/mint-realtime-token.js.
 *
 * Auth lives in nuxt-auth-utils; this token is only a Realtime access ticket.
 */
export default defineEventHandler(async (event) => {
  await guards.requireAuthentication(event)

  const userId = event.context.userId

  const config = useRuntimeConfig()
  const privateJwk = config.supabaseJwtPrivateKey

  if (!privateJwk) {
    throw createError({
      statusCode: 500,
      message: 'Realtime signing key is not configured',
    })
  }

  const { token, expiresAt } = await realtimeUtils.mintRealtimeToken({
    userId,
    privateJwk,
  })

  return { token, expiresAt }
})
