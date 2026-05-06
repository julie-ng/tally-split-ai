import { defineStore } from 'pinia'

/**
 * Store for managing uploads list data from the database
 * This is separate from upload-queue.store which manages the client-side upload queue
 */
export const useUploadsStore = defineStore('uploads', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const uploads = ref([])
  const polygons = ref({}) // Map: { [id]: { page, polygons } }
  // Cache for OCR/Azure Document Intelligence results, keyed by upload id.
  // Only populated for succeeded analyses (failed/in-progress results bypass
  // the cache so the next access re-fetches).
  const analysisCache = ref(new Map())
  // Cache for upload annotations (gpt-4o output), keyed by upload id.
  // Small payload (notes + annotations array); cached unconditionally since
  // a successful response means the data is final.
  const annotationsCache = ref(new Map())
  const loading = ref(false)
  const error = ref(null)
  const debug = ref(false) // Debug logging flag

  // -------- GETTERS --------

  const totalUploads = computed(() => uploads.value.length)

  const getUploadById = computed(() => id => uploads.value.find(u => u.id === id))

  const getPolygonsById = computed(() => id => polygons.value[id] ?? null)

  const getJsonLinksById = computed(() => id => [
    { label: 'Summary', href: `/api/analysis/summary/${id}` },
    { label: 'Annotations', href: `/api/uploads/${id}/annotations` },
    { label: 'OCR', href: `/api/uploads/${id}/ocr` },
    { label: 'Polygons', href: `/api/uploads/${id}/polygons` },
  ])

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
      error.value = toPiniaError(err)
      console.error('[UploadsStore] ❌ failed to fetch uploads:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  // Tracks in-flight refresh promises so concurrent fetches for the same
  // id share a single network call (request coalescing).
  const inflightUploadFetches = new Map()

  /**
   * Cache-aware fetch for a single upload.
   * Returns the local record if it's already the full version; otherwise
   * triggers a refresh from the detail endpoint. Sentinel field for
   * slim-vs-full detection: `userId` (always set on full record, never
   * returned by the slim list endpoint).
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function fetchUploadById (id) {
    const existing = uploads.value.find(u => u.id === id)
    if (existing?.userId) {
      _log(`[UploadsStore] ✅ cache hit (full): ${id}`)
      return existing
    }

    if (inflightUploadFetches.has(id)) {
      _log(`[UploadsStore] ⏳ awaiting in-flight fetch: ${id}`)
      await inflightUploadFetches.get(id)
      return uploads.value.find(u => u.id === id) ?? null
    }

    const promise = refreshUploadById(id).finally(() => {
      inflightUploadFetches.delete(id)
    })
    inflightUploadFetches.set(id, promise)
    await promise
    return uploads.value.find(u => u.id === id) ?? null
  }

  /**
   * Re-fetch a single upload and patch it into local state.
   * Adds the upload if it doesn't exist yet (e.g. created after initial fetch).
   * @param {string} id
   */
  async function refreshUploadById (id) {
    try {
      const data = await requestFetch(`/api/uploads/${id}`)
      const index = uploads.value.findIndex(u => u.id === id)
      if (index !== -1) {
        uploads.value.splice(index, 1, data)
      }
      else {
        uploads.value.unshift(data)
      }
      _log(`[UploadsStore] ✅ refreshed upload: ${id}`)
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to refresh upload ${id}:`, err)
    }
  }

  /**
   * Delete an upload by id
   * Removes from local state after successful API call
   *
   * @param {string} id - The upload id
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  async function deleteUpload (id) {
    try {
      await $fetch(`/api/uploads/${id}`, {
        method: 'DELETE',
      })

      // Remove from local state (mutate in place to preserve array reference)
      const index = uploads.value.findIndex(u => u.id === id)
      if (index !== -1) {
        uploads.value.splice(index, 1)
      }
      _log(`[UploadsStore] ✅ deleted upload: ${id}`)
      return true
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to delete upload ${id}:`, err)
      error.value = toPiniaError(err)
      throw err
    }
  }

  /**
   * Fetch bounding polygons for an upload (lazy loads if not in state)
   * @param {string} id - Upload id
   * @returns {Promise<Object|null>} Polygon data { page, polygons } or null
   */
  async function fetchPolygons (id) {
    if (polygons.value[id]) {
      return polygons.value[id]
    }

    try {
      const result = await requestFetch(`/api/uploads/${id}/polygons`)
      if (result.success) {
        polygons.value[id] = result.data
        _log(`[UploadsStore] ✅ fetched polygons for: ${id}`)
        return result.data
      }
      return null
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to fetch polygons ${id}:`, err)
      return null
    }
  }

  /**
   * Cache-aware fetch for OCR/Azure Document Intelligence analysis results.
   * Hits /api/analysis/summary/[id]. Caches only when Azure status is
   * 'succeeded' — failed/in-progress results bypass the cache so the next
   * access re-fetches.
   * @param {string} id
   * @returns {Promise<Object|null>} The envelope `data` field, or null on error
   */
  async function fetchAnalysisById (id) {
    if (analysisCache.value.has(id)) {
      _log(`[UploadsStore] ✅ analysis cache hit: ${id}`)
      return analysisCache.value.get(id)
    }

    try {
      const result = await requestFetch(`/api/analysis/summary/${id}`)
      if (result.success && result.data?.azureAIDocIntel?.status === 'succeeded') {
        analysisCache.value.set(id, result.data)
        _log(`[UploadsStore] ✅ fetched + cached analysis: ${id}`)
      }
      else {
        _log(`[UploadsStore] ⚠️ analysis not succeeded, not cached: ${id}`)
      }
      return result.data ?? null
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to fetch analysis ${id}:`, err)
      return null
    }
  }

  function clearAnalysisCache () {
    const size = analysisCache.value.size
    analysisCache.value.clear()
    _log(`[UploadsStore] 🧹 cleared ${size} cached analysis result(s)`)
  }

  function clearAnalysisCacheById (id) {
    if (analysisCache.value.delete(id)) {
      _log(`[UploadsStore] 🧹 cleared cached analysis: ${id}`)
    }
  }

  /**
   * Cache-aware fetch for an upload's annotations (gpt-4o handwriting analysis).
   * Returns the slimmed annotations payload: { model, usage, annotations, notes }.
   * @param {string} id
   * @returns {Promise<Object|null>} Annotations data, or null if unavailable
   */
  async function fetchAnnotationsById (id) {
    if (annotationsCache.value.has(id)) {
      _log(`[UploadsStore] ✅ annotations cache hit: ${id}`)
      return annotationsCache.value.get(id)
    }

    try {
      const data = await requestFetch(`/api/uploads/${id}/annotations`)
      annotationsCache.value.set(id, data)
      _log(`[UploadsStore] ✅ fetched + cached annotations: ${id}`)
      return data
    }
    catch (err) {
      // 404 is expected when annotations haven't been generated yet
      if (err?.statusCode !== 404) {
        console.error(`[UploadsStore] ❌ failed to fetch annotations ${id}:`, err)
      }
      return null
    }
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
    getUploadById,
    getPolygonsById,
    getJsonLinksById,

    // Actions
    fetchUploads,
    fetchUploadById,
    fetchPolygons,
    fetchAnalysisById,
    fetchAnnotationsById,
    clearAnalysisCache,
    clearAnalysisCacheById,
    refreshUploadById,
    deleteUpload,
  }
})
