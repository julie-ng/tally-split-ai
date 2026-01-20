import { defineStore } from 'pinia'

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
  const doesSplitSumUp = computed(() => (id) => {
    const split = splits.value[id]
    if (!split || split.userADebt === null || split.userBDebt === null) {
      return true // No validation needed if debts aren't set
    }

    const sum = split.userADebt + split.userBDebt
    const tolerance = 0.01 // Account for floating point precision
    return Math.abs(sum - split.splitAmount) <= tolerance
  })

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
    const currentSplit = splits.value[id]
    if (!currentSplit) {
      const error = new Error(`Split ${id} not found in state`)
      errors.value[id] = error
      throw error
    }

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
   * Update split amount (does NOT recalculate debts)
   * @param {number} id - Split ID
   * @param {number} amount - New split amount
   * @returns {Promise<Object>} Updated split
   */
  async function updateSplitAmount (id, amount) {
    console.log(`🍍 updateSplitAmount(${id})`, amount)
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('Split amount must be a non-negative number')
    }
    return _persistSplit(id, { splitAmount: amount })
  }

  /**
   * Update who paid for the split
   * @param {number} id - Split ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated split
   */
  async function updatePaidBy (id, userId) {
    console.log(`🍍 updatePaidBy(${id})`, userId)
    return _persistSplit(id, { paidBy: userId })
  }

  /**
   * Update debt for one user (automatically calculates the other user's debt)
   * TODO: Need to map userId to userADebt/userBDebt properly - currently hardcoded
   * @param {number} id - Split ID
   * @param {Object} params - { userId: string, amount: number }
   * @returns {Promise<Object>} Updated split
   */
  async function updateDebt (id, { userId, amount }) {
    console.log(`🍍 updateDebt(${id})`, { userId, amount })

    const currentSplit = splits.value[id]
    if (!currentSplit) {
      throw new Error(`Split ${id} not found in state`)
    }

    if (typeof amount !== 'number' || amount < 0) {
      throw new Error('Debt amount must be a non-negative number')
    }

    // Calculate complementary debt
    const otherDebt = Math.floor((currentSplit.splitAmount - amount) * 100) / 100
    const roundedAmount = Math.floor(amount * 100) / 100

    // TODO: This mapping is hardcoded - need to determine proper user mapping
    const payload = userId === 'user1'
      ? { userADebt: roundedAmount, userBDebt: otherDebt }
      : { userADebt: otherDebt, userBDebt: roundedAmount }

    return _persistSplit(id, payload)
  }

  /**
   * Update settlement status
   * @param {number} id - Split ID
   * @param {boolean} isSettled - Settlement status
   * @returns {Promise<Object>} Updated split
   */
  async function updateIsSettled (id, isSettled) {
    console.log(`🍍 updateIsSettled(${id})`, isSettled)
    if (typeof isSettled !== 'boolean') {
      throw new Error('isSettled must be a boolean')
    }
    return _persistSplit(id, { isSettled })
  }

  /**
   * Create a new split
   * @param {Object} data - Split data
   * @returns {Promise<Object>} Created split
   */
  async function createSplit (data) {
    console.log(`🍍 createSplit()`, data)
    try {
      // Calculate debt amounts for equal split
      const halfAmount = Math.floor(data.splitAmount / 2 * 100) / 100

      const payload = {
        ...data,
        userADebt: data.paidBy ? halfAmount : null,
        userBDebt: data.paidBy ? halfAmount : null,
      }

      const result = await $fetch('/api/splits', {
        method: 'POST',
        body: payload,
      })

      // Add to local state
      if (result.created) {
        splits.value[result.created.id] = result.created
        console.log(`✅ Created split: ${result.created.id}`)
      }

      return result.created
    }
    catch (err) {
      console.error('❌ Failed to create split:', err)
      throw err
    }
  }

  /**
   * Delete a split
   * @param {number} id - Split ID
   * @returns {Promise<boolean>}
   */
  async function deleteSplit (id) {
    console.log(`🍍 deleteSplit(${id})`)
    try {
      await $fetch(`/api/splits/${id}`, {
        method: 'DELETE',
      })

      // Remove from local state
      delete splits.value[id]
      delete loading.value[id]
      delete saving.value[id]
      delete errors.value[id]

      console.log(`✅ Deleted split: ${id}`)
      return true
    }
    catch (err) {
      errors.value[id] = err
      console.error(`❌ Failed to delete split ${id}:`, err)
      throw err
    }
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
    doesSplitSumUp,

    // Actions
    fetchSplit,
    updateSplitAmount,
    updatePaidBy,
    updateDebt,
    updateIsSettled,
    createSplit,
    deleteSplit,
    clearSplitError,
  }
})
