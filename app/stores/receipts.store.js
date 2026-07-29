import { defineStore } from 'pinia'
import { useRealtimeStore } from '~/stores/realtime.store'

/**
 * Store for managing receipts with map-based caching and freshness tracking
 * Follows the pattern from expenses.store.js for consistency
 */
export const useReceiptsStore = defineStore('receipts', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const debug = ref(false) // Debug logging flag

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
      const data = await requestFetch('/api/receipts')

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
      const data = await requestFetch(`/api/receipts/${id}`)
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
      // eslint-disable-next-line no-unused-vars
      const result = await $fetch(`/api/receipts/${id}`, {
        method: 'PUT',
        body: updates,
      })

      // Force refetch to get complete data with relations (uploads, expense)
      const freshReceipt = await fetchReceiptById(id, true)

      _log(`[ReceiptsStore] ✅ updated receipt: ${id}`)
      return freshReceipt
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
   * Evict a receipt from the cache WITHOUT calling the API — for when the
   * receipt was already deleted server-side elsewhere (e.g. an expense delete
   * cascaded it away). Keeps this store in sync without it owning the deletion.
   * @param {string} id - Receipt ID
   */
  function evictReceipt (id) {
    if (receiptsById.value[id]) {
      _log(`[ReceiptsStore] evictReceipt(${id}) — removed from cache`)
      delete receiptsById.value[id]
    }
  }

  // -------- REALTIME (Broadcast) --------

  /**
   * Ingest a broadcast payload from the `receipts` topic (migration 0024).
   *
   * MERGE, never replace. The payload is a complete scalar snapshot — authoritative
   * for the fields it carries — but it has no `uploads` relation, which both
   * /api/receipts endpoints join. Replacing would leave components reading
   * `receipt.uploads[0].blobName` with undefined.
   *
   * ⚠️ Sets fetchedAt. This store is TTL-cached (5 min); without it a pushed value
   * would be treated as stale and immediately re-fetched, turning a push into a
   * poll and defeating the point of subscribing.
   *
   * @param {Object} payload - camelCase payload built by the Postgres trigger
   * @param {UUID} payload.id - message ID generated by supabase
   * @param {String} payload.receiptId - our nanoid
   */
  function ingestReceipt (payload) {
    // TEMPORARY (Phase 2 verification) — see ingestExpense for why this is
    // unconditional rather than _log()/debug-gated.
    console.log('📡 [Broadcast] receipts payload:', payload)

    const receiptId = payload?.receiptId
    if (!receiptId) {
      console.warn('📡 [Broadcast] ⚠️ no receiptId in payload — trigger/store key mismatch')
      return
    }

    if (saving.value[receiptId]) {
      console.log(`📡 [Broadcast] ⏭ skipped receipt ${receiptId} — save in flight`)
      return
    }

    const existing = receiptsById.value[receiptId]?.data

    // Ensure our receiptId (not payload id) is mapped to id
    // eslint-disable-next-line no-unused-vars
    const { id: _messageId, receiptId: _receiptId, ...fields } = payload

    receiptsById.value[receiptId] = {
      data: { ...(existing ?? {}), ...fields, id: receiptId },
      fetchedAt: Date.now(),
    }

    console.log(`📡 [Broadcast] ✅ ${existing ? 'merged into' : 'ADDED NEW'} receipt ${receiptId}`)
  }

  /**
   * Subscribe this store to its own broadcast topic. Called from the default
   * layout — stores are lazy, and a store no page has touched would miss the
   * INSERT that creates its first row (OCR step 1 creates the receipt).
   *
   * @param {string} householdId
   * @returns {() => void} unsubscribe
   */
  function subscribeToReceipts (householdId) {
    if (!householdId) return () => {}

    return useRealtimeStore().subscribe(
      `household:${householdId}:receipts`,
      ingestReceipt,
    )
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
    configure,
    fetchReceipts,
    fetchReceiptById,
    updateReceipt,
    deleteReceipt,
    clearReceiptError,
    invalidateReceipt,
    evictReceipt,
    clearAllCaches,

    // Realtime
    ingestReceipt,
    subscribeToReceipts,
  }
})
