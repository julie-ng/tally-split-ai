import { defineStore } from 'pinia'

/**
 * Store for managing uploads list data from the database
 * This is separate from upload-queue.store which manages the client-side upload queue
 */
export const useUploadsStore = defineStore('uploads', () => {
  // -------- STATE --------

  const uploads = ref([])
  const loading = ref(false)
  const error = ref(null)

  // -------- GETTERS --------

  const totalUploads = computed(() => uploads.value.length)

  // -------- ACTIONS --------

  /**
   * Fetch all uploads from the API
   * @returns {Promise<void>}
   */
  async function fetchUploads() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch('/api/uploads')
      uploads.value = data
      console.log(`✅ Fetched ${data.length} uploads`)
    } catch (err) {
      error.value = err
      console.error('❌ Failed to fetch uploads:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete an upload by hashId
   * Removes from local state after successful API call
   *
   * @param {string} hashId - The unique hash identifier for the upload
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  async function deleteUpload(hashId) {
    try {
      await $fetch(`/api/uploads/${hashId}`, {
        method: 'DELETE'
      })

      // Remove from local state (mutate in place to preserve array reference)
      const index = uploads.value.findIndex(u => u.hashId === hashId)
      if (index !== -1) {
        uploads.value.splice(index, 1)
      }
      console.log(`✅ Deleted upload: ${hashId}`)
      return true
    } catch (err) {
      console.error(`❌ Failed to delete upload ${hashId}:`, err)
      error.value = err
      throw err
    }
  }

  return {
    // State
    uploads,
    loading,
    error,

    // Getters
    totalUploads,

    // Actions
    fetchUploads,
    deleteUpload
  }
})
