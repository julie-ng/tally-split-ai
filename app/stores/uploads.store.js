import { defineStore } from 'pinia'
import { useRealtimeStore } from '~/stores/realtime.store'

/**
 * Store for managing uploads list data from the database
 * This is separate from upload-queue.store which manages the client-side upload queue
 */
export const useUploadsStore = defineStore('uploads', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const uploadsById = ref({}) // Map: { [id]: uploadObject }
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

  /**
   * All uploads as an array, newest first. The store keys by id (every access is
   * by id); this is the list projection for table/page consumers.
   *
   * Sorted by uploadedAt desc so a newly-ingested row lands at the top, matching
   * what the old array's unshift did. Rows without uploadedAt (in-flight) sort
   * first — they're the most recent by definition.
   */
  const allUploads = computed(() =>
    Object.values(uploadsById.value).sort((a, b) => {
      if (!a.uploadedAt) return -1
      if (!b.uploadedAt) return 1
      return b.uploadedAt.localeCompare(a.uploadedAt)
    }),
  )

  const totalUploads = computed(() => allUploads.value.length)

  const getUploadById = computed(() => id => uploadsById.value[id])

  const getPolygonsById = computed(() => id => polygons.value[id] ?? null)

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
      // Replace wholesale — the backend is the source of truth for the full list.
      const next = {}
      for (const upload of data) {
        next[upload.id] = upload
      }
      uploadsById.value = next
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
    const existing = uploadsById.value[id]
    if (existing?.userId) {
      _log(`[UploadsStore] ✅ cache hit (full): ${id}`)
      return existing
    }

    if (inflightUploadFetches.has(id)) {
      _log(`[UploadsStore] ⏳ awaiting in-flight fetch: ${id}`)
      await inflightUploadFetches.get(id)
      return uploadsById.value[id] ?? null
    }

    const promise = refreshUploadById(id).finally(() => {
      inflightUploadFetches.delete(id)
    })
    inflightUploadFetches.set(id, promise)
    await promise
    return uploadsById.value[id] ?? null
  }

  /**
   * Re-fetch a single upload and patch it into local state.
   * Adds the upload if it doesn't exist yet (e.g. created after initial fetch).
   *
   * MERGES rather than replacing. The detail endpoint's projection differs from
   * the list's, so overwriting the whole object drops any field the list carries
   * and this doesn't — that's how the Receipt Date column blanked on preview-open.
   * Merging makes the two projections independent instead of requiring the detail
   * one to superset the list one.
   *
   * @param {string} id
   */
  async function refreshUploadById (id) {
    try {
      const data = await requestFetch(`/api/uploads/${id}`)
      uploadsById.value[id] = { ...uploadsById.value[id], ...data }
      _log(`[UploadsStore] ✅ refreshed upload: ${id}`)
    }
    catch (err) {
      console.error(`[UploadsStore] ❌ failed to refresh upload ${id}:`, err)
    }
  }

  // -------- REALTIME (Broadcast) --------

  /**
   * Ingest a broadcast from the `uploads` topic (migration 0025).
   *
   * Two payload shapes arrive on this topic, distinguished by event name:
   *   - INSERT / UPDATE → scalars (this function merges them into the row)
   *   - ANNOTATIONS     → `UPDATE OF annotations_json` only, routed to the cache
   *
   * MERGE, never replace. The payload has no `receipt`/`workflowRuns` relations,
   * which /api/uploads joins — replacing would wipe them. (That's the same failure
   * as refreshUploadById's splice, which is why the detail endpoint's projection
   * has to superset the list's. Merging removes that coupling.)
   *
   * @param {Object} payload - camelCase payload built by the Postgres trigger
   * @param {UUID} payload.id - message ID generated by supabase
   * @param {String} payload.uploadId - our nanoid
   * @param {String} event - INSERT | UPDATE | ANNOTATIONS
   */
  function ingestUpload (payload, event) {
    // TEMPORARY (Phase 5 verification) — unconditional; see ingestExpense.
    console.log(`📡 [Broadcast] uploads payload (${event}):`, payload)

    const uploadId = payload?.uploadId
    if (!uploadId) {
      console.warn('📡 [Broadcast] ⚠️ no uploadId in payload — trigger/store key mismatch')
      return
    }

    if (event === 'ANNOTATIONS') {
      annotationsCache.value.set(uploadId, payload.annotationsJson)
      console.log(`📡 [Broadcast] ✅ cached annotations for upload ${uploadId}`)
      return
    }

    const existing = uploadsById.value[uploadId]

    // Ensure our uploadId (not payload id) is mapped to id
    // eslint-disable-next-line no-unused-vars
    const { id: _messageId, uploadId: _uploadId, ...fields } = payload

    uploadsById.value[uploadId] = { ...(existing ?? {}), ...fields, id: uploadId }

    console.log(`📡 [Broadcast] ✅ ${existing ? 'merged into' : 'ADDED NEW'} upload ${uploadId}`)
  }

  /**
   * Subscribe this store to its own broadcast topic. Called from the default
   * layout — stores are lazy, and one no page has touched would miss the INSERT
   * that creates its first row.
   *
   * @param {string} householdId
   * @returns {() => void} unsubscribe
   */
  function subscribeToUploads (householdId) {
    if (!householdId) return () => {}

    return useRealtimeStore().subscribe(
      `household:${householdId}:uploads`,
      ingestUpload,
    )
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

      delete uploadsById.value[id]
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
   * Batch-delete uploads by id via POST /api/uploads/delete.
   *
   * Only real DB ids should be passed here — in-flight queue rows have no DB
   * record and are removed from the upload-queue store instead (the page splits
   * them; the table disables selection on queue rows anyway).
   *
   * @param {string[]} ids - Upload ids to delete
   * @returns {Promise<{ deletedCount: number, deletedIds: string[], deletedReceiptIds: string[] }>}
   */
  async function batchDelete (ids) {
    try {
      const result = await $fetch('/api/uploads/delete', {
        method: 'POST',
        body: { ids },
      })

      for (const deletedId of result.deletedIds ?? []) {
        delete uploadsById.value[deletedId]
      }

      _log(`[UploadsStore] ✅ batch deleted ${result.deletedCount} upload(s)`)
      return result
    }
    catch (err) {
      console.error('[UploadsStore] ❌ failed to batch delete uploads:', err)
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
    uploadsById,
    loading,
    error,
    debug,

    // Getters
    allUploads,
    totalUploads,
    getUploadById,
    getPolygonsById,

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
    batchDelete,

    // Realtime
    ingestUpload,
    subscribeToUploads,
  }
})
