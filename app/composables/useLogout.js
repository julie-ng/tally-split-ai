import { useRealtimeStore } from '~/stores/realtime.store'
import { useUploadQueueStore } from '~/stores/upload-queue.store'

/**
 * Centralized logout: clear state that outlives the page, then navigate to
 * /logout (the server route that destroys the session cookie + redirects).
 *
 * IMPORTANT
 * - Only the upload QUEUE needs clearing. It's backed by localStorage, so it
 *   survives a browser restart — without this the previous user's filenames
 *   would greet whoever logs in next.
 * - Every other store is in-memory, and navigateTo(external: true) is a full
 *   page load that discards the Pinia instance (verified in devtools). Adding
 *   resets here for them is dead code.
 */
export function useLogout () {
  const realtimeStore = useRealtimeStore()
  const uploadQueueStore = useUploadQueueStore()

  return async function logout () {
    realtimeStore.disconnect()
    uploadQueueStore.reset()

    await navigateTo('/logout', { external: true })
  }
}
