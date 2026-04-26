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
    fetchPolygons,
    refreshUploadByHashId,
    deleteUpload,
  }
})
