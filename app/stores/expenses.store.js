import { defineStore } from 'pinia'
import { expenseRequestSchema, expenseUpdateSchema } from '#shared/utils/zod-schemas/expense.schema.js'
import { toBerlinISODate } from '#shared/utils/expense-date.utils.js'

/**
 * Store for managing expenses with lazy loading and optimistic updates
 * Handles business logic for expense expenseting between two users
 */
export const useExpensesStore = defineStore('expenses', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const debug = ref(false) // Debug logging flag
  const expenses = ref({}) // Map: { [expenseId]: expenseObject }
  const receiptToExpense = ref({}) // Map: { [receiptId]: expenseId }
  const history = ref({}) // Map: { [expenseId]: changeArray }
  const summary = ref(null) // Last-fetched summary { userOneShare, userTwoShare, netBalance, ... }
  const loading = ref({}) // Map: { [expenseId]: boolean }
  const saving = ref({}) // Map: { [expenseId]: boolean }
  const errors = ref({}) // Map: { [expenseId]: error }

  // -------- GETTERS --------

  /**
   * Get a expense by ID from state (doesn't fetch)
   */
  const getExpenseById = computed(() => id => expenses.value[id])

  /**
   * Check if a expense is loading
   */
  const isExpenseLoading = computed(() => id => loading.value[id] || false)

  /**
   * Check if a expense is saving
   */
  const isExpenseSaving = computed(() => id => saving.value[id] || false)

  /**
   * Get error for a expense
   */
  const getExpenseError = computed(() => id => errors.value[id] || null)

  /**
   * Get a expense by receipt ID from state (doesn't fetch)
   */
  const getExpenseByReceiptId = computed(() => (receiptId) => {
    const expenseId = receiptToExpense.value[receiptId]
    return expenseId ? expenses.value[expenseId] : undefined
  })

  /**
   * Get the expenseId for a given receiptId (doesn't fetch)
   */
  const getExpenseIdByReceiptId = computed(() => receiptId => receiptToExpense.value[receiptId] ?? null)

  /**
   * Get all expenses as array (for listing)
   */
  const allExpenses = computed(() => Object.values(expenses.value))

  /**
   * Get expenses filtered by year and month (based on expense.date)
   * @param {number} year - Full year (e.g. 2025)
   * @param {number} month - Month 1-12
   * @returns {Array} Filtered expenses
   */
  const getExpensesByMonth = computed(() => (year, month) => {
    // expense.date is a UTC instant; bucket by its Berlin calendar day so an
    // evening expense never lands in the wrong month/day across the offset.
    const target = `${year}-${String(month).padStart(2, '0')}`
    return allExpenses.value.filter((expense) => {
      const berlinDay = toBerlinISODate(expense.date) // "YYYY-MM-DD" or null
      return berlinDay?.slice(0, 7) === target
    })
  })

  /**
   * Check if share amounts sum to expense amount (for UI warnings)
   * @param {number} id - Expense ID
   * @returns {boolean} True if userOneShare + userTwoShare === splitAmount
   */
  const doesExpenseAddUp = computed(() => (id) => {
    const expense = _getExpense(id)
    if (!expense) return false
    const sum = expense.userOneShare + expense.userTwoShare
    const tolerance = 0.01 // Account for floating point precision
    const doesIt = Math.abs(sum - expense.splitAmount) <= tolerance
    return doesIt
  })

  /**
   * Whether a expense is eligible to be marked settled. A expense must have a
   * known payer (paidByUserId) to settle. Mirrors the API-side guard in
   * server/api/expenses/[id].put.js.
   * @param {number} id - Expense ID
   * @returns {boolean}
   */
  const canSettleExpense = computed(() => (id) => {
    const expense = _getExpense(id)
    if (!expense) return false
    return !!expense.paidByUserId
  })

  /**
   * Get the most recent LLM-generated change for a expense (has confidence/reasoning)
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
   * Get expense from state, throw if not found (DRY helper)
   * @private
   * @param {number} id - Expense ID
   * @returns {Object} The expense object
   */
  function _getExpense (id) {
    const expense = expenses.value[id]
    if (!expense) {
      // const error = new Error(`Expense ${id} not found in state`)
      // errors.value[id] = error
      // throw error
      fetchExpense(id)
    }
    return expense
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
   * Fetch all expenses for the current user
   * @param {Object} filters - Optional filters { year, month }
   * @returns {Promise<Array>} Array of expense objects
   */
  async function fetchAllExpenses (filters = {}) {
    _log('[ExpensesStore] fetchAllExpenses()', filters)
    loading.value.all = true
    errors.value.all = null

    try {
      const params = new URLSearchParams()
      if (filters.year) params.append('year', filters.year)
      if (filters.month) params.append('month', filters.month)

      const url = `/api/expenses${params.toString() ? '?' + params.toString() : ''}`
      const data = await requestFetch(url)

      // Replace expenses map (backend is source of truth)
      const newExpenses = {}
      const newReceiptToExpense = {}
      for (const expense of data) {
        newExpenses[expense.id] = expense
        if (expense.receiptId) {
          newReceiptToExpense[expense.receiptId] = expense.id
        }
      }
      expenses.value = newExpenses
      receiptToExpense.value = newReceiptToExpense
      _log(`[ExpensesStore] ✅ fetched ${data.length} expenses`)
      return data
    }
    catch (err) {
      errors.value.all = err
      console.error('[ExpensesStore] ❌ failed to fetch all expenses:', err)
      throw err
    }
    finally {
      loading.value.all = false
    }
  }

  /**
   * Create a standalone expense (no receipt). The API stamps householdId from
   * the session, auto-assigns the two member slots, and defaults the shares to
   * a 50/50 split of splitAmount when they're omitted — so the form only needs
   * a title + amount.
   *
   * @param {Object} input - { splitAmount, title?, notes?, ... } per expenseRequestSchema
   * @returns {Promise<Object>} The created expense row
   */
  async function createExpense (input) {
    _log('[ExpensesStore] createExpense()', input)

    // Validate in the store (single source of truth) before hitting the API.
    const result = expenseRequestSchema.safeParse(input)
    if (!result.success) {
      const error = new Error(`Invalid expense: ${JSON.stringify(result.error.errors)}`)
      errors.value.create = error
      throw error
    }

    saving.value.create = true
    errors.value.create = null

    try {
      const data = await $fetch('/api/expenses', {
        method: 'POST',
        body: result.data,
      })

      // Cache the new row so the list reflects it without a full refetch.
      const created = data.created
      expenses.value[created.id] = created
      if (created.receiptId) {
        receiptToExpense.value[created.receiptId] = created.id
      }

      // Totals changed — refresh the summary (best-effort).
      await fetchSummary()

      _log(`[ExpensesStore] ✅ created expense: ${created.id}`)
      return created
    }
    catch (err) {
      errors.value.create = err
      console.error('[ExpensesStore] ❌ failed to create expense:', err)
      throw err
    }
    finally {
      saving.value.create = false
    }
  }

  /**
   * Fetch the expenses summary (totals, net balance, settled counts).
   * Optionally scoped to a year/month.
   * @param {Object} filters - Optional { year, month }
   * @returns {Promise<Object|null>} Summary object
   */
  async function fetchSummary (filters = {}) {
    _log('[ExpensesStore] fetchSummary()', filters)
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
        ? `/api/expenses/summary?${queryString}`
        : '/api/expenses/summary'
      const data = await requestFetch(url)
      summary.value = data
      return data
    }
    catch (err) {
      console.error('[ExpensesStore] ❌ failed to fetch summary:', err)
      return null
    }
  }

  /**
   * Fetch a expense by ID (lazy loads if not in state)
   * @param {number} id - Expense ID
   * @returns {Promise<Object>} The expense object
   */
  async function fetchExpense (id) {
    _log(`[ExpensesStore] fetchExpense(${id})`)
    // Return from cache if exists
    if (expenses.value[id]) {
      return expenses.value[id]
    }

    loading.value[id] = true
    errors.value[id] = null

    try {
      const data = await requestFetch(`/api/expenses/${id}`)
      expenses.value[id] = data
      _log(`[ExpensesStore] fetched expense: ${id}`)
      return data
    }
    catch (err) {
      errors.value[id] = err
      console.error(`[ExpensesStore] ❌ failed to fetch expense ${id}:`, err)
      throw err
    }
    finally {
      loading.value[id] = false
    }
  }

  /**
   * Fetch a expense by receipt ID (lazy loads if not in state)
   * @param {number} receiptId - Receipt ID
   * @returns {Promise<Object>} The expense object
   */
  async function fetchExpenseByReceiptId (receiptId) {
    _log(`[ExpensesStore] fetchExpenseByReceiptId(${receiptId})`)

    const cachedExpenseId = receiptToExpense.value[receiptId]
    if (cachedExpenseId && expenses.value[cachedExpenseId]) {
      return expenses.value[cachedExpenseId]
    }

    loading.value[`receipt:${receiptId}`] = true

    try {
      const data = await requestFetch(`/api/receipts/${receiptId}/expense`)
      expenses.value[data.id] = data
      receiptToExpense.value[receiptId] = data.id
      _log(`[ExpensesStore] fetched expense ${data.id} for receipt ${receiptId}`)
      return data
    }
    catch (err) {
      if (err.statusCode === 404) {
        _log(`[ExpensesStore] no expense found for receipt ${receiptId}`)
        return null
      }
      console.error(`[ExpensesStore] ❌ failed to fetch expense for receipt ${receiptId}:`, err)
      throw err
    }
    finally {
      loading.value[`receipt:${receiptId}`] = false
    }
  }

  /**
   * Fetch change history for a expense (lazy loads if not in state)
   * @param {number} id - Expense ID
   * @returns {Promise<Array>} Array of change objects
   */
  async function fetchExpenseHistory (id) {
    _log(`[ExpensesStore] fetchExpenseHistory(${id})`)
    if (history.value[id]) {
      return history.value[id]
    }

    try {
      const { data } = await requestFetch(`/api/history/expenses/${id}`)
      history.value[id] = data
      _log(`[ExpensesStore] fetched history for expense: ${id}`)
      return data
    }
    catch (err) {
      console.error(`[ExpensesStore] ❌ failed to fetch expense history ${id}:`, err)
      history.value[id] = []
      return []
    }
  }

  /**
   * Internal helper: Persist expense updates with optimistic updates and rollback
   * @private
   * @param {number} id - Expense ID
   * @param {Object} payload - Ready-to-send payload
   * @returns {Promise<Object>} Updated expense
   */
  async function _persistExpense (id, payload) {
    const currentExpense = _getExpense(id)

    // Store original state for rollback
    const originalExpense = { ...currentExpense }

    // Optimistic update
    expenses.value[id] = { ...currentExpense, ...payload }

    saving.value[id] = true
    errors.value[id] = null

    // The PUT is the source of truth for "did the write commit". The reconcile
    // GET is best-effort polish. They get SEPARATE error handling:
    //   - PUT fails    → roll back the optimistic update (nothing persisted).
    //   - PUT ok, GET fails → write IS committed; KEEP the optimistic value
    //     (it equals what we just saved) and skip the refresh. Rolling back here
    //     would discard a change that actually persisted — store lying the other
    //     way. We do not delete-then-fetch: that leaves expenses.value[id]
    //     undefined for the request duration, which makes components reading the
    //     expense (e.g. the preview inputs) get `undefined` and flash/error.
    try {
      // PUT returns only { success: true } — it does not echo the row back (so a
      // write-scoped token can't read it).
      await $fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        body: payload,
      })
    }
    catch (err) {
      expenses.value[id] = originalExpense
      errors.value[id] = err
      saving.value[id] = false
      console.error(`[ExpensesStore] ❌ Failed to update expense ${id}:`, err)
      throw err
    }

    // Write committed. Reconcile with the authoritative row (with receipt join),
    // overwriting IN PLACE. A failure here is non-fatal: keep the optimistic value.
    try {
      const fresh = await requestFetch(`/api/expenses/${id}`)
      expenses.value[id] = fresh
      _log(`[ExpensesStore] ✅ updated expense: ${id}`)
      return fresh
    }
    catch (err) {
      console.warn(`[ExpensesStore] ⚠️ saved expense ${id} but reconcile fetch failed; keeping optimistic value`, err)
      return expenses.value[id]
    }
    finally {
      saving.value[id] = false
    }
  }

  /**
   * Smart update function - routes to appropriate business logic based on which properties changed
   * @param {number} id - Expense ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated expense
   */
  async function updateExpense (id, updates) {
    _log(`[ExpensesStore] updateExpense(${id})`, updates)

    // Validate with zod
    const result = expenseUpdateSchema.safeParse(updates)
    if (!result.success) {
      const error = new Error(`Invalid updates: ${JSON.stringify(result.error.errors)}`)
      errors.value[id] = error
      throw error
    }

    const currentExpense = _getExpense(id)
    const payload = { ...updates }

    // Business logic: Apply transformations based on what changed
    if ('userOneShare' in updates && !('userTwoShare' in updates)) {
      // Only userOneShare changed - calculate userTwoShare
      payload.userTwoShare = Math.floor((currentExpense.splitAmount - updates.userOneShare) * 100) / 100
    }
    else if ('userTwoShare' in updates && !('userOneShare' in updates)) {
      // Only userTwoShare changed - calculate userOneShare
      payload.userOneShare = Math.floor((currentExpense.splitAmount - updates.userTwoShare) * 100) / 100
    }
    // If both share fields provided, use as-is
    // If splitAmount changed alone, no auto-calculation (per user requirement)

    return _persistExpense(id, payload)
  }

  /**
   * Clear error for a specific expense
   * @param {number} id - Expense ID
   */
  function clearExpenseError (id) {
    delete errors.value[id]
  }

  /**
   * Mark a specific list of expenses as settled.
   * Server silently drops IDs the caller doesn't own, IDs already settled,
   * and IDs without a paidByUserId.
   *
   * @param {string[]} expenseIds
   * @returns {Promise<Object>} Result with updatedCount + settledIds
   */
  async function markSettled (expenseIds) {
    _log(`[ExpensesStore] markSettled(${expenseIds.length} ids)`)

    if (expenseIds.length === 0) {
      return { success: true, updatedCount: 0, settledIds: [] }
    }

    // Snapshot for rollback
    const originals = {}
    for (const id of expenseIds) {
      if (expenses.value[id]) {
        originals[id] = { ...expenses.value[id] }
      }
    }

    // Optimistic update — server will only confirm the eligible ones via
    // settledIds in the response; we reconcile after success.
    for (const id of expenseIds) {
      if (expenses.value[id]) {
        expenses.value[id] = { ...expenses.value[id], isSettled: true }
      }
    }

    try {
      const result = await $fetch('/api/expenses/batch-settle', {
        method: 'PUT',
        body: { expenseIds },
      })
      _log(`[ExpensesStore] ✅ settled ${result.updatedCount}/${expenseIds.length} expenses`)

      // Reconcile: roll back any ID we optimistically flipped that the server
      // didn't actually settle (e.g. unattributed slipped through client filter).
      const confirmed = new Set(result.settledIds ?? [])
      for (const id of expenseIds) {
        if (!confirmed.has(id) && originals[id]) {
          expenses.value[id] = originals[id]
        }
      }

      return result
    }
    catch (err) {
      for (const id in originals) {
        expenses.value[id] = originals[id]
      }
      console.error('[ExpensesStore] ❌ failed to mark expenses as settled:', err)
      throw err
    }
  }

  return {
    // State
    debug,
    expenses,
    receiptToExpense,
    history,
    summary,
    loading,
    saving,
    errors,

    // Getters
    getExpenseById,
    getExpenseByReceiptId,
    getExpenseIdByReceiptId,
    isExpenseLoading,
    isExpenseSaving,
    getExpenseError,
    allExpenses,
    getExpensesByMonth,
    doesExpenseAddUp,
    canSettleExpense,
    getLlmChange,

    // Actions
    configure,
    createExpense,
    fetchAllExpenses,
    fetchSummary,
    fetchExpense,
    fetchExpenseByReceiptId,
    fetchExpenseHistory,
    updateExpense,
    clearExpenseError,
    markSettled,
  }
})
