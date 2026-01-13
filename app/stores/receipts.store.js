import { defineStore } from 'pinia'

/**
 * Store for managing receipts list data from the database
 */
export const useReceiptsStore = defineStore('receipts', () => {
  // -------- STATE --------

  const receipts = ref([])
  const loading = ref(false)
  const error = ref(null)

  // -------- GETTERS --------

  const totalReceipts = computed(() => receipts.value.length)

  // -------- ACTIONS --------

  /**
   * Fetch all receipts from the API
   * @returns {Promise<void>}
   */
  async function fetchReceipts() {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch('/api/receipts')
      receipts.value = data
      console.log(`✅ Fetched ${data.length} receipts`)
    }
    catch (err) {
      error.value = err
      console.error('❌ Failed to fetch receipts:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single receipt by ID
   * @param {number} id - The receipt ID
   * @returns {Promise<Object>} The receipt object with uploads relation
   */
  async function fetchReceipt(id) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch(`/api/receipts/${id}`)
      console.log(`✅ Fetched receipt: ${id}`)
      return data
    }
    catch (err) {
      error.value = err
      console.error(`❌ Failed to fetch receipt ${id}:`, err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update a receipt by ID
   * @param {number} id - The receipt ID
   * @param {Object} data - The receipt data to update
   * @returns {Promise<Object>} The updated receipt object
   */
  async function updateReceipt(id, data) {
    try {
      const result = await $fetch(`/api/receipts/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Update local state if receipt exists in list
      const index = receipts.value.findIndex(r => r.id === id)
      if (index !== -1 && result.updated) {
        receipts.value[index] = result.updated
      }

      console.log(`✅ Updated receipt: ${id}`)
      return result.updated
    }
    catch (err) {
      console.error(`❌ Failed to update receipt ${id}:`, err)
      error.value = err
      throw err
    }
  }

  /**
   * Delete a receipt by ID
   * Removes from local state after successful API call
   *
   * @param {number} id - The receipt ID
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  async function deleteReceipt(id) {
    try {
      await $fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      })

      // Remove from local state (mutate in place to preserve array reference)
      const index = receipts.value.findIndex(r => r.id === id)
      if (index !== -1) {
        receipts.value.splice(index, 1)
      }
      console.log(`✅ Deleted receipt: ${id}`)
      return true
    }
    catch (err) {
      console.error(`❌ Failed to delete receipt ${id}:`, err)
      error.value = err
      throw err
    }
  }

  return {
    // State
    receipts,
    loading,
    error,

    // Getters
    totalReceipts,

    // Actions
    fetchReceipts,
    fetchReceipt,
    updateReceipt,
    deleteReceipt,
  }
})
