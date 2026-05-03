import { defineStore } from 'pinia'

/**
 * SAS token cache for blob reads. Keyed by blobName.
 *
 * - Coalesces concurrent requests for the same blob (one in-flight Promise
 *   per blobName, all awaiters share it).
 * - Returns cached URL until 30s before expiry.
 * - 5-minute TTL is set server-side; we just respect the expiresAt field.
 *
 * cleared() on logout via useLogout() composable.
 */
export const useTokensStore = defineStore('tokens', () => {
  // blobName -> { url, expiresAt }
  const cache = ref(new Map())
  // blobName -> Promise<url> (in-flight requests)
  const inflight = new Map()
  const debug = ref(false)

  const EXPIRY_BUFFER_MS = 30 * 1000

  function isFresh (entry) {
    if (!entry) return false
    const expiresAtMs = new Date(entry.expiresAt).getTime()
    return expiresAtMs - Date.now() > EXPIRY_BUFFER_MS
  }

  async function getReadUrl (blobName) {
    if (!blobName) throw new Error('blobName is required')

    const cached = cache.value.get(blobName)
    if (isFresh(cached)) {
      _log(`[TokensStore] ✅ cache hit for: ${blobName} (expires ${cached.expiresAt})`)
      return cached.url
    }

    if (inflight.has(blobName)) {
      _log(`[TokensStore] ⏳ awaiting in-flight request for: ${blobName}`)
      return inflight.get(blobName)
    }

    if (cached) {
      _log(`[TokensStore] ♻️  cache expired, refetching: ${blobName} (expired ${cached.expiresAt})`)
    }
    else {
      _log(`[TokensStore] 🆕 cache miss, fetching: ${blobName}`)
    }

    const promise = (async () => {
      try {
        const data = await $fetch('/api/tokens/read', {
          method: 'POST',
          body: { action: 'read', blobName },
        })
        cache.value.set(blobName, {
          url: data.blobUrlWithSas,
          expiresAt: data.expiresAt,
        })
        _log(`[TokensStore] ✅ fetched token for: ${blobName} (expires ${data.expiresAt})`)
        return data.blobUrlWithSas
      }
      catch (err) {
        console.error(`[TokensStore] ❌ failed to fetch token for ${blobName}:`, err)
        throw err
      }
      finally {
        inflight.delete(blobName)
      }
    })()

    inflight.set(blobName, promise)
    return promise
  }

  function clear () {
    const size = cache.value.size
    cache.value.clear()
    inflight.clear()
    _log(`[TokensStore] 🧹 cleared ${size} cached token(s)`)
  }

  function _log (...args) {
    if (debug.value) {
      console.log(...args)
    }
  }

  return {
    debug,
    getReadUrl,
    clear,
  }
})
