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
  const getSplitById = computed(() => (id) => splits.value[id])

  /**
   * Check if a split is loading
   */
  const isSplitLoading = computed(() => (id) => loading.value[id] || false)

  /**
   * Check if a split is saving
   */
  const isSplitSaving = computed(() => (id) => saving.value[id] || false)

  /**
   * Get error for a split
   */
  const getSplitError = computed(() => (id) => errors.value[id] || null)

  /**
   * Get all splits as array (for listing)
   */
  const allSplits = computed(() => Object.values(splits.value))

  // -------- ACTIONS --------

  /**
   * Fetch a split by ID (lazy loads if not in state)
   * @param {number} id - Split ID
   * @returns {Promise<Object>} The split object
   */
  async function fetchSplit (id) {
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
   * Update a split with validation and optimistic updates
   * @param {number} id - Split ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated split
   */
  async function updateSplit (id, updates) {
    const currentSplit = splits.value[id]
    if (!currentSplit) {
      const error = new Error(`Split ${id} not found in state`)
      errors.value[id] = error
      throw error
    }

    // Store original state for rollback
    const originalSplit = { ...currentSplit }

    // Optimistic update
    splits.value[id] = { ...currentSplit, ...updates }

    saving.value[id] = true
    errors.value[id] = null

    try {
      // Prepare update payload
      const payload = { ...updates }

      // BUSINESS LOGIC: Calculate debt amounts if splitAmount changed
      if (updates.splitAmount !== undefined) {
        const halfAmount = Math.floor(updates.splitAmount / 2 * 100) / 100
        payload.userADebt = halfAmount
        payload.userBDebt = halfAmount
      }

      // VALIDATION: Ensure debts add up to splitAmount
      const finalSplitAmount = payload.splitAmount ?? currentSplit.splitAmount
      const finalUserADebt = payload.userADebt ?? currentSplit.userADebt
      const finalUserBDebt = payload.userBDebt ?? currentSplit.userBDebt

      if (finalUserADebt !== null && finalUserBDebt !== null) {
        const sum = finalUserADebt + finalUserBDebt
        const tolerance = 0.01
        if (Math.abs(sum - finalSplitAmount) > tolerance) {
          throw new Error(`Debt amounts (${sum}) don't match split amount (${finalSplitAmount})`)
        }
      }

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

      // Show toast error (using Nuxt UI toast)
      const toast = useToast()
      toast.add({
        title: 'Error updating split',
        description: err.message || 'Failed to save changes',
        color: 'red',
        timeout: 5000,
      })

      throw err
    }
    finally {
      saving.value[id] = false
    }
  }

  /**
   * Create a new split
   * @param {Object} data - Split data
   * @returns {Promise<Object>} Created split
   */
  async function createSplit (data) {
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

    // Actions
    fetchSplit,
    updateSplit,
    createSplit,
    deleteSplit,
    clearSplitError,
  }
})
