import { defineStore } from 'pinia'
import { splitUpdateSchema } from '~~/shared/utils/zod-schemas/split.schema.js'

/**
 * Store for managing splits with lazy loading and optimistic updates
 * Handles business logic for expense splitting between two users
 */
export const useSplitsStore = defineStore('splits', () => {
  // -------- STATE --------

  const splits = ref({}) // Map: { [splitId]: splitObject }
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
   * Get all splits as array (for listing)
   */
  const allSplits = computed(() => Object.values(splits.value))

  /**
   * Check if debt amounts sum to split amount (for UI warnings)
   * @param {number} id - Split ID
   * @returns {boolean} True if userADebt + userBDebt === splitAmount
   */
  const doesSplitAddUp = computed(() => (id) => {
    const split = _getSplit(id)
    const sum = split.userADebt + split.userBDebt
    const tolerance = 0.01 // Account for floating point precision
    const doesIt = Math.abs(sum - split.splitAmount) <= tolerance
    // console.log(`🍍 doesSplitAddUp(${id})`, doesIt)
    return doesIt
  })

  // -------- INTERNAL HELPERS --------

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
   * Fetch a split by ID (lazy loads if not in state)
   * @param {number} id - Split ID
   * @returns {Promise<Object>} The split object
   */
  async function fetchSplit (id) {
    console.log(`🍍 fetchSplit(${id})`)
    // Return from cache if exists
    if (splits.value[id]) {
      return splits.value[id]
    }

    loading.value[id] = true
    errors.value[id] = null

    try {
      const data = await $fetch(`/api/splits/${id}`)
      splits.value[id] = data
      console.log(`✅ Fetched split: ${id}`)
      return data
    }
    catch (err) {
      errors.value[id] = err
      console.error(`❌ Failed to fetch split ${id}:`, err)
      throw err
    }
    finally {
      loading.value[id] = false
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
      // Call backend API
      const result = await $fetch(`/api/splits/${id}`, {
        method: 'PUT',
        body: payload,
      })

      // Update with server response
      if (result.updated) {
        splits.value[id] = result.updated
      }

      console.log(`✅ Updated split: ${id}`)
      return result.updated
    }
    catch (err) {
      // Rollback optimistic update on error
      splits.value[id] = originalSplit
      errors.value[id] = err
      console.error(`❌ Failed to update split ${id}:`, err)
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
    console.log(`🍍 updateSplit(${id})`, updates)

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
    if ('userADebt' in updates && !('userBDebt' in updates)) {
      // Only userADebt changed - calculate userBDebt
      payload.userBDebt = Math.floor((currentSplit.splitAmount - updates.userADebt) * 100) / 100
    }
    else if ('userBDebt' in updates && !('userADebt' in updates)) {
      // Only userBDebt changed - calculate userADebt
      payload.userADebt = Math.floor((currentSplit.splitAmount - updates.userBDebt) * 100) / 100
    }
    // If both debt fields provided, use as-is
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

  return {
    // State
    splits,
    loading,
    saving,
    errors,

    // Getters
    getSplitById,
    isSplitLoading,
    isSplitSaving,
    getSplitError,
    allSplits,
    doesSplitAddUp,

    // Actions
    fetchSplit,
    updateSplit,
    clearSplitError,
  }
})
