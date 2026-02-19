import { defineStore } from 'pinia'
import { asyncUtils } from '~~/shared/utils/async.utils.js'

/**
 * Store for managing receipts with map-based caching and freshness tracking
 * Follows the pattern from splits.store.js for consistency
 */
export const useReceiptsStore = defineStore('receipts', () => {
  // -------- STATE --------

  const debug = ref(false) // Debug logging flag

  // Cache structure: { [id]: { data: receiptObject, fetchedAt: timestamp } }
  const receiptsById = ref({})
  const loading = ref({}) // Per-ID loading: { [id]: boolean, all: boolean }
  const saving = ref({}) // Per-ID saving: { [id]: boolean }
  const analyzing = ref({}) // Per-ID analyzing: { [id]: boolean }
  const bulkAnalyzing = ref(false) // True while a bulk analyze operation is in progress
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
   * Check if a receipt is being analyzed
   */
  const isReceiptAnalyzing = computed(() => id => analyzing.value[id] || false)

  /**
   * Check if a receipt has been analyzed
   */
  const isReceiptAnalyzed = computed(() => (id) => {
    const receipt = receiptsById.value[id]?.data
    return receipt?.analysisStatus === 'analyzed'
  })

  /**
   * Get the upload hashId for a receipt's first upload
   */
  const getUploadHashId = computed(() => id => receiptsById.value[id]?.data?.uploads?.[0]?.hashId)

  /**
   * Get error for a receipt
   */
  const getReceiptError = computed(() => id => errors.value[id] || null)

  /**
   * Get all receipts as array (for table listing)
   * Only returns receipts that have data (not empty cache entries)
   *
   * @returns Array
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
   * Internal logger helper - only logs when debug flag is enabled
   * @private
   */
  function _log (...args) {
    if (debug.value) {
      console.log(...args)
    }
  }

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
    return await fetchReceiptById(id)
  }

  // -------- ACTIONS --------

  /**
   * Configure store options
   * @param {Object} options - Configuration options
   * @param {boolean} options.debug - Enable debug logging
   */
  function configure ({ debug: debugFlag } = {}) {
    if (debugFlag !== undefined) {
      debug.value = debugFlag
    }
  }

  /**
   * Fetch all receipts and populate cache
   * Updates cache for all returned receipts
   * @returns {Promise<Array>} Array of receipt objects
   */
  async function fetchReceipts () {
    _log('[ReceiptsStore] fetchReceipts() - fetches ALL receipts')
    loading.value.all = true
    errors.value.all = null

    try {
      const data = await $fetch('/api/receipts')

      // Iterate and cache each receipt with timestamp
      for (const receipt of data) {
        _cacheReceipt(receipt)
      }

      _log(`[ReceiptsStore] ✅ Fetched and cached ${data.length} receipts`)
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
  async function fetchReceiptById (id, force = false) {
    _log(`[ReceiptsStore] fetchReceiptById(${id}, force=${force})`)

    // Return from cache if fresh and not forced
    if (!force && _isCacheFresh(id)) {
      _log(`[ReceiptsStore] ⚡️ using cached receipt: ${id}`)
      return receiptsById.value[id].data
    }

    loading.value[id] = true
    errors.value[id] = null

    try {
      const data = await $fetch(`/api/receipts/${id}`)
      _cacheReceipt(data)
      _log(`[ReceiptsStore] ✅ fetched and cached receipt: ${id}`)
      return data
    }
    catch (err) {
      errors.value[id] = err
      console.error(`[ReceiptsStore] ❌ Failed to fetch receipt ${id}:`, err)
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
    _log(`[ReceiptsStore] updateReceipt(${id})`, updates)

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

      _log(`[ReceiptsStore] ✅ updated receipt: ${id}`)
      return result.updated
    }
    catch (err) {
      // Rollback optimistic update on error
      receiptsById.value[id] = originalEntry
      errors.value[id] = err
      console.error(`[ReceiptsStore] ❌ Failed to update receipt ${id}:`, err)
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
    _log(`[ReceiptsStore] deleteReceipt(${id})`)

    // Store reference for potential rollback
    const originalEntry = receiptsById.value[id]

    // Optimistic removal from cache
    delete receiptsById.value[id]

    try {
      await $fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      })

      _log(`[ReceiptsStore] ✅ deleted receipt: ${id}`)
      return true
    }
    catch (err) {
      // Rollback - restore to cache
      if (originalEntry) {
        receiptsById.value[id] = originalEntry
      }
      errors.value[id] = err
      console.error(`[ReceiptsStore] ❌ failed to delete receipt ${id}:`, err)
      throw err
    }
  }

  /**
   * Trigger Azure Document Intelligence analysis for a receipt
   * Fetches hashId from cached receipt, calls analysis API, then force-refetches receipt
   * @param {number} id - Receipt ID
   */
  async function analyzeReceipt (id) {
    await _ensureReceipt(id)
    const hashId = getUploadHashId.value(id)
    if (!hashId) {
      throw createError({ statusCode: 400, message: 'No upload found for this receipt' })
    }

    analyzing.value[id] = true
    errors.value[id] = null

    try {
      await $fetch(`/api/analysis/${hashId}`, { method: 'POST' })
      await fetchReceiptById(id, true)
    }
    catch (err) {
      errors.value[id] = err
      throw err
    }
    finally {
      analyzing.value[id] = false
    }
  }

  /**
   * Analyze multiple receipts sequentially with a 100ms delay between each
   * to stay well under Azure Document Intelligence's 15/sec rate limit.
   * Does not stop on individual errors — each failure is tracked in errors[id].
   * @param {number[]} ids - Array of receipt IDs to analyze
   */
  async function analyzeBulk (ids, { onEach } = {}) {
    bulkAnalyzing.value = true
    try {
      for (const id of ids) {
        try {
          await analyzeReceipt(id)
          if (onEach) onEach(id, null)
        }
        catch (err) {
          if (onEach) onEach(id, err)
        }
        await asyncUtils.sleep(100)
      }
    }
    finally {
      bulkAnalyzing.value = false
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
    debug,
    receiptsById,
    loading,
    saving,
    analyzing,
    bulkAnalyzing,
    errors,

    // Getters
    getReceiptById,
    isReceiptLoading,
    isReceiptSaving,
    isReceiptAnalyzing,
    isReceiptAnalyzed,
    getUploadHashId,
    getReceiptError,
    allReceipts,
    totalReceipts,
    getAdjacentReceiptIds,

    // Actions
    configure,
    fetchReceipts,
    fetchReceiptById,
    updateReceipt,
    deleteReceipt,
    analyzeReceipt,
    analyzeBulk,
    clearReceiptError,
    invalidateReceipt,
    clearAllCaches,
  }
})
