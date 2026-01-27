import { defineStore } from 'pinia'

/**
 * Store for managing receipts with map-based caching and freshness tracking
 * Follows the pattern from splits.store.js for consistency
 */
export const useReceiptsStore = defineStore('receipts', () => {
  // -------- STATE --------

  // Cache structure: { [id]: { data: receiptObject, fetchedAt: timestamp } }
  const receiptsById = ref({})
  const loading = ref({}) // Per-ID loading: { [id]: boolean, all: boolean }
  const saving = ref({}) // Per-ID saving: { [id]: boolean }
  const errors = ref({}) // Per-ID errors: { [id]: error, all: error }

  const CACHE_TTL = 300000 // 5 minutes in milliseconds

  // -------- GETTERS --------

  /**
   * Get a receipt by ID from cache (doesn't fetch)
   * @returns {Receipt|undefined} The receipt object or undefined
   */
  const getReceiptById = computed(() => id => receiptsById.value[id]?.data)

  /**
   * Check if a receipt is loading
   */
  const isReceiptLoading = computed(() => id => loading.value[id] || false)

  /**
   * Check if a receipt is saving
   */
  const isReceiptSaving = computed(() => id => saving.value[id] || false)

  /**
   * Get error for a receipt
   */
  const getReceiptError = computed(() => id => errors.value[id] || null)

  /**
   * Get all receipts as array (for table listing)
   * Only returns receipts that have data (not empty cache entries)
   */
  const allReceipts = computed(() => {
    return Object.values(receiptsById.value)
      .filter(entry => entry.data)
      .map(entry => entry.data)
  })

  /**
   * Total count of cached receipts
   */
  const totalReceipts = computed(() => allReceipts.value.length)

  /**
   * Get adjacent (prev/next) receipt IDs for navigation, ordered by ID
   * ⚠️ ideally this should be ordered by reciept date.
   * But we're keeping logic simple for POC with just 1 user.
   * @returns {{ prevId: number|null, nextId: number|null }}
   */
  const getAdjacentReceiptIds = computed(() => (currentId) => {
    const sortedIds = allReceipts.value
      .map(r => r.id)
      .sort((a, b) => a - b)

    const idx = sortedIds.indexOf(currentId)
    if (idx === -1) return { prevId: null, nextId: null }

    return {
      prevId: idx > 0 ? sortedIds[idx - 1] : null,
      nextId: idx < sortedIds.length - 1 ? sortedIds[idx + 1] : null,
    }
  })

  // -------- INTERNAL HELPERS --------

  /**
   * Check if receipt cache is fresh (< 5 minutes old)
   * @private
   */
  function _isCacheFresh (id) {
    const cached = receiptsById.value[id]
    if (!cached || !cached.fetchedAt) return false
    return (Date.now() - cached.fetchedAt) < CACHE_TTL
  }

  /**
   * Store a receipt in cache with timestamp
   * @private
   */
  function _cacheReceipt (receipt) {
    receiptsById.value[receipt.id] = {
      data: receipt,
      fetchedAt: Date.now(),
    }
  }

  /**
   * Ensure receipt exists in cache (fetch if missing/stale)
   * Used internally to ensure receipt exists before operations
   * @private
   */
  async function _ensureReceipt (id) {
    if (_isCacheFresh(id)) {
      return receiptsById.value[id].data
    }
    return await fetchReceipt(id)
  }

  // -------- ACTIONS --------

  /**
   * Fetch all receipts and populate cache
   * Updates cache for all returned receipts
   * @returns {Promise<Array>} Array of receipt objects
   */
  async function fetchReceipts () {
    console.log('🍍 fetchReceipts()')
    loading.value.all = true
    errors.value.all = null

    try {
      const data = await $fetch('/api/receipts')

      // Iterate and cache each receipt with timestamp
      for (const receipt of data) {
        _cacheReceipt(receipt)
      }

      console.log(`✅ Fetched and cached ${data.length} receipts`)
      return data
    }
    catch (err) {
      errors.value.all = err
      console.error('❌ Failed to fetch receipts:', err)
      throw createError({
        statusCode: err.statusCode || 500,
        message: err.message || 'Failed to fetch receipts',
      })
    }
    finally {
      loading.value.all = false
    }
  }

  /**
   * Fetch a single receipt by ID with smart caching
   * Returns from cache if fresh, otherwise fetches from API
   * @param {number} id - Receipt ID
   * @param {boolean} force - Force fetch even if cache is fresh
   * @returns {Promise<Object>} The receipt object with uploads relation
   */
  async function fetchReceipt (id, force = false) {
    console.log(`🍍 fetchReceipt(${id}, force=${force})`)

    // Return from cache if fresh and not forced
    if (!force && _isCacheFresh(id)) {
      console.log(`✅ Using cached receipt: ${id}`)
      return receiptsById.value[id].data
    }

    loading.value[id] = true
    errors.value[id] = null

    try {
      const data = await $fetch(`/api/receipts/${id}`)
      _cacheReceipt(data)
      console.log(`✅ Fetched and cached receipt: ${id}`)
      return data
    }
    catch (err) {
      errors.value[id] = err
      console.error(`❌ Failed to fetch receipt ${id}:`, err)
      throw createError({
        statusCode: err.statusCode || 404,
        message: err.message || `Receipt ${id} not found`,
      })
    }
    finally {
      loading.value[id] = false
    }
  }

  /**
   * Update a receipt with optimistic updates and rollback
   * @param {number} id - Receipt ID
   * @param {Object} updates - Fields to update (validated against receiptInputSchema)
   * @returns {Promise<Object>} Updated receipt
   */
  async function updateReceipt (id, updates) {
    console.log(`🍍 updateReceipt(${id})`, updates)

    // Ensure receipt is in cache (fetch if needed)
    const currentReceipt = await _ensureReceipt(id)

    // Store original for rollback
    const originalEntry = { ...receiptsById.value[id] }

    // Optimistic update - merge updates into cache
    receiptsById.value[id] = {
      data: { ...currentReceipt, ...updates },
      fetchedAt: Date.now(), // Refresh timestamp
    }

    saving.value[id] = true
    errors.value[id] = null

    try {
      const result = await $fetch(`/api/receipts/${id}`, {
        method: 'PUT',
        body: updates,
      })

      // Update cache with server response (source of truth)
      if (result.updated) {
        _cacheReceipt(result.updated)
      }

      console.log(`✅ Updated receipt: ${id}`)
      return result.updated
    }
    catch (err) {
      // Rollback optimistic update on error
      receiptsById.value[id] = originalEntry
      errors.value[id] = err
      console.error(`❌ Failed to update receipt ${id}:`, err)
      throw err
    }
    finally {
      saving.value[id] = false
    }
  }

  /**
   * Delete a receipt and remove from cache
   * @param {number} id - Receipt ID
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  async function deleteReceipt (id) {
    console.log(`🍍 deleteReceipt(${id})`)

    // Store reference for potential rollback
    const originalEntry = receiptsById.value[id]

    // Optimistic removal from cache
    delete receiptsById.value[id]

    try {
      await $fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      })

      console.log(`✅ Deleted receipt: ${id}`)
      return true
    }
    catch (err) {
      // Rollback - restore to cache
      if (originalEntry) {
        receiptsById.value[id] = originalEntry
      }
      errors.value[id] = err
      console.error(`❌ Failed to delete receipt ${id}:`, err)
      throw err
    }
  }

  /**
   * Clear error for a specific receipt
   */
  function clearReceiptError (id) {
    delete errors.value[id]
  }

  /**
   * Invalidate cache for a receipt (force refetch next time)
   */
  function invalidateReceipt (id) {
    if (receiptsById.value[id]) {
      delete receiptsById.value[id].fetchedAt
    }
  }

  /**
   * Clear all caches (useful for logout or major state changes)
   */
  function clearAllCaches () {
    receiptsById.value = {}
    loading.value = {}
    saving.value = {}
    errors.value = {}
  }

  return {
    // State
    receiptsById,
    loading,
    saving,
    errors,

    // Getters
    getReceiptById,
    isReceiptLoading,
    isReceiptSaving,
    getReceiptError,
    allReceipts,
    totalReceipts,
    getAdjacentReceiptIds,

    // Actions
    fetchReceipts,
    fetchReceipt,
    updateReceipt,
    deleteReceipt,
    clearReceiptError,
    invalidateReceipt,
    clearAllCaches,
  }
})
