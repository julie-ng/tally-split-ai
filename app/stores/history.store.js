import { defineStore } from 'pinia'

/**
 * Change history for receipts and expenses — the client side of `/api/history/*`.
 *
 * WHY ITS OWN STORE (it looks like a rule violation, it isn't):
 * - History is CROSS-CUTTING, not a domain slice. One `changes` table backs both
 *   entity types; the backend already models it that way with its own route
 *   group. Splitting the same shape across expenses.store + receipts.store would
 *   duplicate the fetch/cache/ingest boilerplate and leave the merge homeless.
 * - It is READ-ONLY and APPEND-ONLY. No optimistic updates, no rollback, no TTL —
 *   nothing here can go stale, entries are only ever added. That makes the seam
 *   clean in a way a normal domain split wouldn't be.
 *
 * Consumers: the expense preview's History tab (merged timeline) and
 * `expense/LLMAnalysis.vue` (lookup — finds the pipeline's own change).
 */
export const useHistoryStore = defineStore('history', () => {
  const requestFetch = useRequestFetch()

  // -------- STATE --------

  const debug = ref(false)

  // Kept in two maps rather than one keyed by `${type}:${id}` — an expense and
  // its receipt are fetched and read independently, and the merged view is a
  // getter over both.
  const expenseHistory = ref({}) // Map: { [expenseId]: changeArray }
  const receiptHistory = ref({}) // Map: { [receiptId]: changeArray }

  // Tracks in-flight fetches so concurrent callers (tab + LLMAnalysis mounting
  // together) share one request instead of racing two.
  const inFlight = new Map()

  // -------- GETTERS --------

  /**
   * Raw expense entries, or undefined while unfetched. `undefined` vs `[]` is
   * load-bearing: it's how a consumer tells "loading" from "genuinely empty".
   */
  const getExpenseHistory = computed(() => id => expenseHistory.value[id])

  const getReceiptHistory = computed(() => id => receiptHistory.value[id])

  /**
   * The merged timeline: receipt + expense entries, each tagged with the entity
   * it came from, newest first.
   *
   * `receiptId` is nullable — a standalone expense (no receipt) merges to just
   * its own entries. Returns undefined while EITHER side is still unfetched, so
   * the tab shows one skeleton rather than a half-timeline that jumps.
   */
  const getMergedHistory = computed(() => (expenseId, receiptId) => {
    const expenseEntries = expenseId ? expenseHistory.value[expenseId] : []
    const receiptEntries = receiptId ? receiptHistory.value[receiptId] : []

    if (expenseEntries === undefined || receiptEntries === undefined) {
      return undefined
    }

    return [
      ...receiptEntries.map(entry => ({ ...entry, entityType: 'receipt' })),
      ...expenseEntries.map(entry => ({ ...entry, entityType: 'expense' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  /**
   * The most recent LLM-generated change for an expense — a pipeline change that
   * carries confidence/reasoning. Used to surface what the model decided and why.
   *
   * IMPORTANT
   * - `confidence !== null` is doing more filtering than its name suggests: it
   *   also excludes deterministic task changes (create-expense). That IS the
   *   intent here, but the code doesn't say so — don't reuse this getter for
   *   anything broader than the LLM analysis panel without revisiting it.
   *
   * @returns {Object|null} null when unfetched OR when there is no such change —
   *   callers pair it with getExpenseHistory() if they need to tell those apart.
   */
  const getLlmChange = computed(() => (id) => {
    const changes = expenseHistory.value[id]
    if (!changes) return null
    return changes.find(c => c.source?.startsWith('task:') && c.confidence !== null) ?? null
  })

  // -------- INTERNAL HELPERS --------

  function _log (...args) {
    if (debug.value) {
      console.log(...args)
    }
  }

  /**
   * Shared fetch for both entity types — they differ only by URL and target map.
   *
   * A failure caches `[]` instead of rethrowing: history is supplementary, and an
   * empty timeline degrades better than a broken panel.
   *
   * @private
   */
  async function _fetchHistory (kind, id, force) {
    const target = kind === 'expense' ? expenseHistory : receiptHistory
    const cacheKey = `${kind}:${id}`

    if (!force && target.value[id]) {
      return target.value[id]
    }

    const pending = inFlight.get(cacheKey)
    if (pending) {
      return pending
    }

    const request = requestFetch(`/api/history/${kind}s/${id}`)
      .then(({ data }) => {
        target.value[id] = data
        _log(`[HistoryStore] ✅ fetched ${kind} history: ${id} (${data.length})`)
        return data
      })
      .catch((err) => {
        console.error(`[HistoryStore] ❌ failed to fetch ${kind} history ${id}:`, err)
        target.value[id] = []
        return []
      })
      .finally(() => {
        inFlight.delete(cacheKey)
      })

    inFlight.set(cacheKey, request)
    return request
  }

  // -------- ACTIONS --------

  function configure ({ debug: debugFlag } = {}) {
    if (debugFlag !== undefined) {
      debug.value = debugFlag
    }
  }

  /**
   * @param {string} id - Expense ID
   * @param {boolean} force - Re-fetch even if already loaded
   * @returns {Promise<Array>}
   */
  async function fetchExpenseHistory (id, force = false) {
    _log(`[HistoryStore] fetchExpenseHistory(${id}, force=${force})`)
    return _fetchHistory('expense', id, force)
  }

  /**
   * @param {string} id - Receipt ID
   * @param {boolean} force - Re-fetch even if already loaded
   * @returns {Promise<Array>}
   */
  async function fetchReceiptHistory (id, force = false) {
    _log(`[HistoryStore] fetchReceiptHistory(${id}, force=${force})`)
    return _fetchHistory('receipt', id, force)
  }

  function clearAllCaches () {
    expenseHistory.value = {}
    receiptHistory.value = {}
    inFlight.clear()
  }

  return {
    // State
    debug,
    expenseHistory,
    receiptHistory,

    // Getters
    getExpenseHistory,
    getReceiptHistory,
    getMergedHistory,
    getLlmChange,

    // Actions
    configure,
    fetchExpenseHistory,
    fetchReceiptHistory,
    clearAllCaches,
  }
})
