import { defineStore } from 'pinia'
import { splitUpdateSchema } from '#shared/utils/zod-schemas/split.schema.js'

/**
 * Store for managing splits with lazy loading and optimistic updates
 * Handles business logic for expense splitting between two users
 */
export const useSplitsStore = defineStore('splits', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const debug = ref(false) // Debug logging flag
  const splits = ref({}) // Map: { [splitId]: splitObject }
  const receiptToSplit = ref({}) // Map: { [receiptId]: splitId }
  const history = ref({}) // Map: { [splitId]: changeArray }
  const summary = ref(null) // Last-fetched summary { userOneShare, userTwoShare, netBalance, ... }
  const loading = ref({}) // Map: { [splitId]: boolean }
  const saving = ref({}) // Map: { [splitId]: boolean }
  const errors = ref({}) // Map: { [splitId]: error }

  // -------- GETTERS --------

  /**
   * Get a split by ID from state (doesn't fetch)
   */
  const getSplitById = computed(() => id => splits.value[id])

  /**
   * Check if a split is loading
   */
  const isSplitLoading = computed(() => id => loading.value[id] || false)

  /**
   * Check if a split is saving
   */
  const isSplitSaving = computed(() => id => saving.value[id] || false)

  /**
   * Get error for a split
   */
  const getSplitError = computed(() => id => errors.value[id] || null)

  /**
   * Get a split by receipt ID from state (doesn't fetch)
   */
  const getSplitByReceiptId = computed(() => (receiptId) => {
    const splitId = receiptToSplit.value[receiptId]
    return splitId ? splits.value[splitId] : undefined
  })

  /**
   * Get the splitId for a given receiptId (doesn't fetch)
   */
  const getSplitIdByReceiptId = computed(() => receiptId => receiptToSplit.value[receiptId] ?? null)

  /**
   * Get all splits as array (for listing)
   */
  const allSplits = computed(() => Object.values(splits.value))

  /**
   * Get splits filtered by year and month (based on receipt.date)
   * @param {number} year - Full year (e.g. 2025)
   * @param {number} month - Month 1-12
   * @returns {Array} Filtered splits
   */
  const getSplitsByMonth = computed(() => (year, month) => {
    return allSplits.value.filter((split) => {
      if (!split.receipt?.date) return false
      const date = new Date(split.receipt.date)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })
  })

  /**
   * Check if share amounts sum to split amount (for UI warnings)
   * @param {number} id - Split ID
   * @returns {boolean} True if userOneShare + userTwoShare === splitAmount
   */
  const doesSplitAddUp = computed(() => (id) => {
    const split = _getSplit(id)
    if (!split) return false
    const sum = split.userOneShare + split.userTwoShare
    const tolerance = 0.01 // Account for floating point precision
    const doesIt = Math.abs(sum - split.splitAmount) <= tolerance
    return doesIt
  })

  /**
   * Whether a split is eligible to be marked settled. A split must have a
   * known payer (paidByUserId) to settle. Mirrors the API-side guard in
   * server/api/splits/[id].put.js.
   * @param {number} id - Split ID
   * @returns {boolean}
   */
  const canSettleSplit = computed(() => (id) => {
    const split = _getSplit(id)
    if (!split) return false
    return !!split.paidByUserId
  })

  /**
   * Get the most recent LLM-generated change for a split (has confidence/reasoning)
   */
  const getLlmChange = computed(() => (id) => {
    const changes = history.value[id]
    if (!changes) return null
    return changes.find(c => c.source?.startsWith('task:') && c.confidence !== null) ?? null
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
   * Get split from state, throw if not found (DRY helper)
   * @private
   * @param {number} id - Split ID
   * @returns {Object} The split object
   */
  function _getSplit (id) {
    const split = splits.value[id]
    if (!split) {
      // const error = new Error(`Split ${id} not found in state`)
      // errors.value[id] = error
      // throw error
      fetchSplit(id)
    }
    return split
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
   * Fetch all splits for the current user
   * @param {Object} filters - Optional filters { year, month }
   * @returns {Promise<Array>} Array of split objects
   */
  async function fetchAllSplits (filters = {}) {
    _log('[SplitsStore] fetchAllSplits()', filters)
    loading.value.all = true
    errors.value.all = null

    try {
      const params = new URLSearchParams()
      if (filters.year) params.append('year', filters.year)
      if (filters.month) params.append('month', filters.month)

      const url = `/api/splits${params.toString() ? '?' + params.toString() : ''}`
      const data = await requestFetch(url)

      // Replace splits map (backend is source of truth)
      const newSplits = {}
      const newReceiptToSplit = {}
      for (const split of data) {
        newSplits[split.id] = split
        if (split.receiptId) {
          newReceiptToSplit[split.receiptId] = split.id
        }
      }
      splits.value = newSplits
      receiptToSplit.value = newReceiptToSplit
      _log(`[SplitsStore] ✅ fetched ${data.length} splits`)
      return data
    }
    catch (err) {
      errors.value.all = err
      console.error('[SplitsStore] ❌ failed to fetch all splits:', err)
      throw err
    }
    finally {
      loading.value.all = false
    }
  }

  /**
   * Fetch the splits summary (totals, net balance, settled counts).
   * Optionally scoped to a year/month.
   * @param {Object} filters - Optional { year, month }
   * @returns {Promise<Object|null>} Summary object
   */
  async function fetchSummary (filters = {}) {
    _log('[SplitsStore] fetchSummary()', filters)
    try {
      const params = new URLSearchParams()
      if (filters.year) {
        params.append('year', filters.year)
      }
      if (filters.month) {
        params.append('month', filters.month)
      }
      const queryString = params.toString()
      const url = queryString
        ? `/api/splits/summary?${queryString}`
        : '/api/splits/summary'
      const data = await requestFetch(url)
      summary.value = data
      return data
    }
    catch (err) {
      console.error('[SplitsStore] ❌ failed to fetch summary:', err)
      return null
    }
  }

  /**
   * Fetch a split by ID (lazy loads if not in state)
   * @param {number} id - Split ID
   * @returns {Promise<Object>} The split object
   */
  async function fetchSplit (id) {
    _log(`[SplitsStore] fetchSplit(${id})`)
    // Return from cache if exists
    if (splits.value[id]) {
      return splits.value[id]
    }

    loading.value[id] = true
    errors.value[id] = null

    try {
      const data = await requestFetch(`/api/splits/${id}`)
      splits.value[id] = data
      _log(`[SplitsStore] fetched split: ${id}`)
      return data
    }
    catch (err) {
      errors.value[id] = err
      console.error(`[SplitsStore] ❌ failed to fetch split ${id}:`, err)
      throw err
    }
    finally {
      loading.value[id] = false
    }
  }

  /**
   * Fetch a split by receipt ID (lazy loads if not in state)
   * @param {number} receiptId - Receipt ID
   * @returns {Promise<Object>} The split object
   */
  async function fetchSplitByReceiptId (receiptId) {
    _log(`[SplitsStore] fetchSplitByReceiptId(${receiptId})`)

    const cachedSplitId = receiptToSplit.value[receiptId]
    if (cachedSplitId && splits.value[cachedSplitId]) {
      return splits.value[cachedSplitId]
    }

    loading.value[`receipt:${receiptId}`] = true

    try {
      const data = await requestFetch(`/api/receipts/${receiptId}/split`)
      splits.value[data.id] = data
      receiptToSplit.value[receiptId] = data.id
      _log(`[SplitsStore] fetched split ${data.id} for receipt ${receiptId}`)
      return data
    }
    catch (err) {
      if (err.statusCode === 404) {
        _log(`[SplitsStore] no split found for receipt ${receiptId}`)
        return null
      }
      console.error(`[SplitsStore] ❌ failed to fetch split for receipt ${receiptId}:`, err)
      throw err
    }
    finally {
      loading.value[`receipt:${receiptId}`] = false
    }
  }

  /**
   * Fetch change history for a split (lazy loads if not in state)
   * @param {number} id - Split ID
   * @returns {Promise<Array>} Array of change objects
   */
  async function fetchSplitHistory (id) {
    _log(`[SplitsStore] fetchSplitHistory(${id})`)
    if (history.value[id]) {
      return history.value[id]
    }

    try {
      const { data } = await requestFetch(`/api/history/splits/${id}`)
      history.value[id] = data
      _log(`[SplitsStore] fetched history for split: ${id}`)
      return data
    }
    catch (err) {
      console.error(`[SplitsStore] ❌ failed to fetch split history ${id}:`, err)
      history.value[id] = []
      return []
    }
  }

  /**
   * Internal helper: Persist split updates with optimistic updates and rollback
   * @private
   * @param {number} id - Split ID
   * @param {Object} payload - Ready-to-send payload
   * @returns {Promise<Object>} Updated split
   */
  async function _persistSplit (id, payload) {
    const currentSplit = _getSplit(id)

    // Store original state for rollback
    const originalSplit = { ...currentSplit }

    // Optimistic update
    splits.value[id] = { ...currentSplit, ...payload }

    saving.value[id] = true
    errors.value[id] = null

    try {
      // Call backend API. The PUT returns only { success: true } — it does not
      // echo the row back (so a write-scoped token can't read it). Re-fetch the
      // authoritative split (with its receipt join) to reconcile the optimistic
      // update. Clear the cache entry first so fetchSplit doesn't short-circuit.
      await $fetch(`/api/splits/${id}`, {
        method: 'PUT',
        body: payload,
      })

      delete splits.value[id]
      const fresh = await fetchSplit(id)

      _log(`[SplitsStore] ✅ updated split: ${id}`)
      return fresh
    }
    catch (err) {
      // Rollback optimistic update on error
      splits.value[id] = originalSplit
      errors.value[id] = err
      console.error(`[SplitsStore] ❌ Failed to update split ${id}:`, err)
      throw err
    }
    finally {
      saving.value[id] = false
    }
  }

  /**
   * Smart update function - routes to appropriate business logic based on which properties changed
   * @param {number} id - Split ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated split
   */
  async function updateSplit (id, updates) {
    _log(`[SplitsStore] updateSplit(${id})`, updates)

    // Validate with zod
    const result = splitUpdateSchema.safeParse(updates)
    if (!result.success) {
      const error = new Error(`Invalid updates: ${JSON.stringify(result.error.errors)}`)
      errors.value[id] = error
      throw error
    }

    const currentSplit = _getSplit(id)
    const payload = { ...updates }

    // Business logic: Apply transformations based on what changed
    if ('userOneShare' in updates && !('userTwoShare' in updates)) {
      // Only userOneShare changed - calculate userTwoShare
      payload.userTwoShare = Math.floor((currentSplit.splitAmount - updates.userOneShare) * 100) / 100
    }
    else if ('userTwoShare' in updates && !('userOneShare' in updates)) {
      // Only userTwoShare changed - calculate userOneShare
      payload.userOneShare = Math.floor((currentSplit.splitAmount - updates.userTwoShare) * 100) / 100
    }
    // If both share fields provided, use as-is
    // If splitAmount changed alone, no auto-calculation (per user requirement)

    return _persistSplit(id, payload)
  }

  /**
   * Clear error for a specific split
   * @param {number} id - Split ID
   */
  function clearSplitError (id) {
    delete errors.value[id]
  }

  /**
   * Mark a specific list of splits as settled.
   * Server silently drops IDs the caller doesn't own, IDs already settled,
   * and IDs without a paidByUserId.
   *
   * @param {string[]} splitIds
   * @returns {Promise<Object>} Result with updatedCount + settledIds
   */
  async function markSettled (splitIds) {
    _log(`[SplitsStore] markSettled(${splitIds.length} ids)`)

    if (splitIds.length === 0) {
      return { success: true, updatedCount: 0, settledIds: [] }
    }

    // Snapshot for rollback
    const originals = {}
    for (const id of splitIds) {
      if (splits.value[id]) {
        originals[id] = { ...splits.value[id] }
      }
    }

    // Optimistic update — server will only confirm the eligible ones via
    // settledIds in the response; we reconcile after success.
    for (const id of splitIds) {
      if (splits.value[id]) {
        splits.value[id] = { ...splits.value[id], isSettled: true }
      }
    }

    try {
      const result = await $fetch('/api/splits/batch-settle', {
        method: 'PUT',
        body: { splitIds },
      })
      _log(`[SplitsStore] ✅ settled ${result.updatedCount}/${splitIds.length} splits`)

      // Reconcile: roll back any ID we optimistically flipped that the server
      // didn't actually settle (e.g. unattributed slipped through client filter).
      const confirmed = new Set(result.settledIds ?? [])
      for (const id of splitIds) {
        if (!confirmed.has(id) && originals[id]) {
          splits.value[id] = originals[id]
        }
      }

      return result
    }
    catch (err) {
      for (const id in originals) {
        splits.value[id] = originals[id]
      }
      console.error('[SplitsStore] ❌ failed to mark splits as settled:', err)
      throw err
    }
  }

  return {
    // State
    debug,
    splits,
    receiptToSplit,
    history,
    summary,
    loading,
    saving,
    errors,

    // Getters
    getSplitById,
    getSplitByReceiptId,
    getSplitIdByReceiptId,
    isSplitLoading,
    isSplitSaving,
    getSplitError,
    allSplits,
    getSplitsByMonth,
    doesSplitAddUp,
    canSettleSplit,
    getLlmChange,

    // Actions
    configure,
    fetchAllSplits,
    fetchSummary,
    fetchSplit,
    fetchSplitByReceiptId,
    fetchSplitHistory,
    updateSplit,
    clearSplitError,
    markSettled,
  }
})
