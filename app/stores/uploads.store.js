import { defineStore } from 'pinia'

/**
 * Store for managing uploads list data from the database
 * This is separate from upload-queue.store which manages the client-side upload queue
 */
export const useUploadsStore = defineStore('uploads', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const uploads = ref([])
  const polygons = ref({}) // Map: { [hashId]: { page, polygons } }
  // Cache for OCR/Azure Document Intelligence results, keyed by upload hashId.
  // Only populated for succeeded analyses (failed/in-progress results bypass
  // the cache so the next access re-fetches).
  const analysisCache = ref(new Map())
  const loading = ref(false)
  const error = ref(null)
  const debug = ref(false) // Debug logging flag

  // -------- GETTERS --------

  const totalUploads = computed(() => uploads.value.length)

  const getUploadByHashId = computed(() => hashId => uploads.value.find(u => u.hashId === hashId))

  const getPolygonsByHashId = computed(() => hashId => polygons.value[hashId] ?? null)

  // -------- ACTIONS --------

  /**
   * Fetch all uploads from the API
   * @returns {Promise<void>}
   */
  async function fetchUploads () {
    loading.value = true
    error.value = null

    try {
      const data = await requestFetch('/api/uploads')
      uploads.value = data
      _log(`[UploadsStore] ✅ fetched ${data.length} uploads`)
    }
    catch (err) {
      error.value = err
      console.error('[UploadsStore] ❌ failed to fetch uploads:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  // Tracks in-flight refresh promises so concurrent fetches for the same
  // hashId share a single network call (request coalescing).
  const inflightUploadFetches = new Map()

  /**
   * Cache-aware fetch for a single upload.
   * Returns the local record if it's already the full version; otherwise
   * triggers a refresh from the detail endpoint. Sentinel field for
   * slim-vs-full detection: `userId` (always set on full record, never
   * returned by the slim list endpoint).
   * @param {string} hashId
   * @returns {Promise<Object|null>}
   */
  async function fetchUploadByHashId (hashId) {
    const existing = uploads.value.find(u => u.hashId === hashId)
    if (existing?.userId) {
      _log(`[UploadsStore] ✅ cache hit (full): ${hashId}`)
      return existing
    }

    if (inflightUploadFetches.has(hashId)) {
      _log(`[UploadsStore] ⏳ awaiting in-flight fetch: ${hashId}`)
      await inflightUploadFetches.get(hashId)
      return uploads.value.find(u => u.hashId === hashId) ?? null
    }

    const promise = refreshUploadByHashId(hashId).finally(() => {
      inflightUploadFetches.delete(hashId)
    })
    inflightUploadFetches.set(hashId, promise)
    await promise
    return uploads.value.find(u => u.hashId === hashId) ?? null
  }

  /**
   * Re-fetch a single upload and patch it into local state.
   * Adds the upload if it doesn't exist yet (e.g. created after initial fetch).
   * @param {string} hashId
   */
  async function refreshUploadByHashId (hashId) {
    try {
      const data = await requestFetch(`/api/uploads/${hashId}`)
      const index = uploads.value.findIndex(u => u.hashId === hashId)
      if (index !== -1) {
        uploads.value.splice(index, 1, data)
      }
      else {
        uploads.value.unshift(data)
      }
      _log(`[UploadsStore] ✅ refreshed upload: ${hashId}`)
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to refresh upload ${hashId}:`, err)
    }
  }

  /**
   * Delete an upload by hashId
   * Removes from local state after successful API call
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  async function deleteUpload (hashId) {
    try {
      await $fetch(`/api/uploads/${hashId}`, {
        method: 'DELETE',
      })

      // Remove from local state (mutate in place to preserve array reference)
      const index = uploads.value.findIndex(u => u.hashId === hashId)
      if (index !== -1) {
        uploads.value.splice(index, 1)
      }
      _log(`[UploadsStore] ✅ deleted upload: ${hashId}`)
      return true
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to delete upload ${hashId}:`, err)
      error.value = err
      throw err
    }
  }

  /**
   * Fetch bounding polygons for an upload (lazy loads if not in state)
   * @param {string} hashId - Upload hash ID
   * @returns {Promise<Object|null>} Polygon data { page, polygons } or null
   */
  async function fetchPolygons (hashId) {
    if (polygons.value[hashId]) {
      return polygons.value[hashId]
    }

    try {
      const result = await requestFetch(`/api/uploads/${hashId}/polygons`)
      if (result.success) {
        polygons.value[hashId] = result.data
        _log(`[UploadsStore] ✅ fetched polygons for: ${hashId}`)
        return result.data
      }
      return null
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to fetch polygons ${hashId}:`, err)
      return null
    }
  }

  /**
   * Cache-aware fetch for OCR/Azure Document Intelligence analysis results.
   * Hits /api/analysis/summary/[hashId]. Caches only when Azure status is
   * 'succeeded' — failed/in-progress results bypass the cache so the next
   * access re-fetches.
   * @param {string} hashId
   * @returns {Promise<Object|null>} The envelope `data` field, or null on error
   */
  async function fetchAnalysisByHashId (hashId) {
    if (analysisCache.value.has(hashId)) {
      _log(`[UploadsStore] ✅ analysis cache hit: ${hashId}`)
      return analysisCache.value.get(hashId)
    }

    try {
      const result = await requestFetch(`/api/analysis/summary/${hashId}`)
      if (result.success && result.data?.azureAIDocIntel?.status === 'succeeded') {
        analysisCache.value.set(hashId, result.data)
        _log(`[UploadsStore] ✅ fetched + cached analysis: ${hashId}`)
      }
      else {
        _log(`[UploadsStore] ⚠️ analysis not succeeded, not cached: ${hashId}`)
      }
      return result.data ?? null
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to fetch analysis ${hashId}:`, err)
      return null
    }
  }

  function clearAnalysisCache () {
    const size = analysisCache.value.size
    analysisCache.value.clear()
    _log(`[UploadsStore] 🧹 cleared ${size} cached analysis result(s)`)
  }

  /**
   * Internal logger helper - only logs when debug flag is enabled
   * @private
   */
  function _log (...args) {
    if (debug.value) {
      console.log(...args)
    }
  }

  return {
    // State
    uploads,
    loading,
    error,
    debug,

    // Getters
    totalUploads,
    getUploadByHashId,
    getPolygonsByHashId,

    // Actions
    fetchUploads,
    fetchUploadByHashId,
    fetchPolygons,
    fetchAnalysisByHashId,
    clearAnalysisCache,
    refreshUploadByHashId,
    deleteUpload,
  }
})
