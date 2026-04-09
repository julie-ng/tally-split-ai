import { defineStore } from 'pinia'
import { WORKFLOW_STATUS } from '~~/shared/enums/workflow-status.js'

/**
 * Store for managing uploads list data from the database
 * This is separate from upload-queue.store which manages the client-side upload queue
 */
export const useUploadsStore = defineStore('uploads', () => {
  // -------- STATE --------

  const uploads = ref([])
  const loading = ref(false)
  const error = ref(null)
  const debug = ref(false) // Debug logging flag

  // -------- GETTERS --------

  const totalUploads = computed(() => uploads.value.length)

  const getUploadByHashId = computed(() => hashId => uploads.value.find(u => u.hashId === hashId))

  /**
   * Get the latest workflow run for an upload by hashId
   * @param {string} hashId
   * @returns {object|null}
   */
  function latestWorkflowById (hashId) {
    return getUploadByHashId.value(hashId)?.workflowRuns?.[0] ?? null
  }

  /**
   * Check if an upload has any workflow runs
   * @param {string} hashId
   * @returns {boolean}
   */
  function hasWorkflowsById (hashId) {
    return (getUploadByHashId.value(hashId)?.workflowRunCount ?? 0) > 0
  }

  /**
   * Check if an upload's latest workflow has errors
   * True when: workflow explicitly failed, or required retries (2+ runs)
   * @param {string} hashId
   * @returns {boolean}
   */
  function hasWorkflowErrorsById (hashId) {
    const upload = getUploadByHashId.value(hashId)
    if (!upload) return false

    const runCount = upload.workflowRunCount ?? 0
    if (runCount >= 2) return true

    const workflow = upload.workflowRuns?.[0]
    return workflow?.status === WORKFLOW_STATUS.FAILED
      || workflow?.status === WORKFLOW_STATUS.PARTIAL
  }

  // -------- ACTIONS --------

  /**
   * Fetch all uploads from the API
   * @returns {Promise<void>}
   */
  async function fetchUploads () {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch('/api/uploads')
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
    latestWorkflowById,
    hasWorkflowsById,
    hasWorkflowErrorsById,

    // Actions
    fetchUploads,
    deleteUpload,
  }
})
