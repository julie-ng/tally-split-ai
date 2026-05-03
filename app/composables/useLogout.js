import { useRealtimeStore } from '~/stores/realtime.store'
import { useTokensStore } from '~/stores/tokens.store'
import { useUploadsStore } from '~/stores/uploads.store'

/**
 * Centralized logout: clear in-memory state that should not survive a session
 * change, then navigate to /logout (the server route that destroys the
 * session cookie + redirects).
 *
 * Add new client-side caches here as the app grows (uploads, receipts, etc.)
 * if they hold sensitive or user-scoped data.
 */
export function useLogout () {
  const realtimeStore = useRealtimeStore()
  const tokensStore = useTokensStore()
  const uploadsStore = useUploadsStore()

  return async function logout () {
    realtimeStore.disconnect()
    tokensStore.clear()
    uploadsStore.clearAnalysisCache()
    await navigateTo('/logout', { external: true })
  }
}
