import { defineStore } from 'pinia'
import { useRealtimeStore } from '~/stores/realtime.store'

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

  // Latest change per expense — { [expenseId]: { source, createdAt } }. Feeds the
  // "Updated" column, so it's fetched in BATCHES for a list rather than per id.
  // Separate from expenseHistory: that holds full entries for one expense, this
  // holds one summary row for many.
  const expenseUpdates = ref({})

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
   * Latest change for an expense, or null if it has none (or isn't fetched yet).
   * @returns {{ source: string, createdAt: string }|null}
   */
  const getExpenseUpdate = computed(() => id => expenseUpdates.value[id] ?? null)

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

  /**
   * Fetch the latest change for a batch of expenses and merge into the map.
   *
   * MERGES rather than replaces, so paging through a list accumulates instead of
   * dropping what the previous page loaded.
   *
   * IMPORTANT
   * - No cache-hit short-circuit, unlike the per-entity fetches. This is a
   *   "latest" value: it changes whenever the expense is edited, so an already-
   *   present id still has to be re-read. Callers control frequency.
   * - Ids with no history are absent from the response. They're written as null
   *   so the UI can tell "fetched, never changed" from "not fetched yet".
   *
   * @param {string[]} ids
   * @returns {Promise<Object>} the merged map
   */
  async function fetchExpenseUpdates (ids) {
    const unique = [...new Set(ids)].filter(Boolean)
    if (unique.length === 0) {
      return expenseUpdates.value
    }

    try {
      const { data } = await requestFetch('/api/history/expenses/updates', {
        query: { ids: unique.join(',') },
      })
      const next = { ...expenseUpdates.value }
      for (const id of unique) {
        next[id] = data[id] ?? null
      }
      expenseUpdates.value = next
      _log(`[HistoryStore] ✅ fetched updates for ${unique.length} expense(s)`)
    }
    catch (err) {
      console.error('[HistoryStore] ❌ failed to fetch expense updates:', err)
    }

    return expenseUpdates.value
  }

  function reset () {
    expenseHistory.value = {}
    receiptHistory.value = {}
    expenseUpdates.value = {}
    inFlight.clear()
  }

  // -------- REALTIME (Broadcast) --------

  /**
   * Ingest a broadcast signal from the `history` topic (migration 0030).
   *
   * Unlike the other content stores, this payload is a SIGNAL, not a snapshot — a
   * history entry is a join+regroup, not a row, so the trigger can't send one
   * without duplicating `/api/history/*`'s shape in plpgsql. We re-fetch instead.
   *
   * IMPORTANT
   * - Only refreshes an entity ALREADY in the cache. An unfetched entity has
   *   nothing to go stale, and the next fetch is a cache miss that reads fresh —
   *   so skipping costs nothing. Without this, every receipt the OCR pipeline
   *   analyzes would trigger a GET on every connected client for history nobody
   *   has opened.
   *
   * @param {Object} payload - built by the Postgres trigger
   * @param {'expense'|'receipt'} payload.entityType
   * @param {string} payload.entityId
   */
  function ingestHistory (payload) {
    // TEMPORARY (verification): unconditional, matching the other stores' logs.
    console.log('📡 [Broadcast] history payload:', payload)

    const { entityType, entityId } = payload ?? {}
    if (!entityType || !entityId) {
      console.warn('📡 [Broadcast] ⚠️ history payload missing entityType/entityId')
      return
    }

    // The "Updated" column tracks the LATEST change, so any signal for a row the
    // table already loaded invalidates it. Same already-in-cache guard: an id we
    // never fetched isn't on screen.
    if (entityType === 'expense' && expenseUpdates.value[entityId] !== undefined) {
      fetchExpenseUpdates([entityId])
    }

    const target = entityType === 'expense' ? expenseHistory : receiptHistory
    if (target.value[entityId] === undefined) {
      return
    }

    const refetch = entityType === 'expense' ? fetchExpenseHistory : fetchReceiptHistory
    refetch(entityId, true)
  }

  /**
   * Subscribe this store to its own broadcast topic. Called from the default
   * layout — stores are lazy, and one no page has touched would miss the signal.
   *
   * @param {string} householdId
   * @returns {() => void} unsubscribe
   */
  function subscribeToHistory (householdId) {
    if (!householdId) return () => {}

    return useRealtimeStore().subscribe(
      `household:${householdId}:history`,
      ingestHistory,
    )
  }

  return {
    // State
    debug,
    expenseHistory,
    receiptHistory,
    expenseUpdates,

    // Getters
    getExpenseHistory,
    getReceiptHistory,
    getMergedHistory,
    getLlmChange,
    getExpenseUpdate,

    // Actions
    configure,
    fetchExpenseHistory,
    fetchReceiptHistory,
    fetchExpenseUpdates,
    reset,

    // Realtime
    ingestHistory,
    subscribeToHistory,
  }
})
