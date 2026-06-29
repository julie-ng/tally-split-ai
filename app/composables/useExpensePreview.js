import { useExpensesStore } from '~/stores/expenses.store'
import { useReceiptsStore } from '~/stores/receipts.store'

/**
 * Drives the tabbed preview panel (ExpensePreviewPanel) on every expense list
 * page. Owns the ?preview URL sync, open-state, active tab, and warm-on-open of
 * the expense + its receipt.
 *
 * The `?preview=<expenseId>` query param is the single source of truth for
 * *which* expense is previewed. Open-state is seeded ONCE from the URL (so a
 * cold-load `?preview=<id>` auto-opens) then owned locally — NOT a computed off
 * the id, which would re-trigger on every row swap. Call from page setup (the
 * page owns the router; this packages the canonical ?preview behavior).
 *
 * @returns {{
 *   previewExpenseId: import('vue').ComputedRef<string|null>,
 *   previewExpense: import('vue').ComputedRef<object|null>,
 *   isPreviewOpen: import('vue').Ref<boolean>,
 *   activeTab: import('vue').Ref<string>,
 *   openPreview: (event: Event, row: { original: { id: string } }) => void,
 *   closePreview: () => void,
 * }}
 */
export function useExpensePreview () {
  const route = useRoute()
  const router = useRouter()
  const expensesStore = useExpensesStore()
  const receiptsStore = useReceiptsStore()

  const previewExpenseId = computed(() => route.query.preview ?? null)

  const previewExpense = computed(() => previewExpenseId.value
    ? expensesStore.getExpenseById(previewExpenseId.value)
    : null,
  )

  // Seeded once from the URL (cold-load auto-open), then owned locally.
  const isPreviewOpen = ref(!!previewExpenseId.value)

  // Active preview tab (panel presentation). Option A: every NEW expense opens
  // on Overview. Keyed off id-change (not the open event) so it also resets when
  // the user clicks a different row while the panel is already open.
  const activeTab = ref('overview')

  // Warm the expense + reset the tab whenever the selected id changes. The list
  // already populated most expenses (so getExpenseById is warm and the leaf
  // doesn't flash); this covers the cold-load `?preview=<id>` path and is a
  // no-op (cache hit) for the common case.
  //
  // Also warm the linked RECEIPT into the receipts store (which owns receipts +
  // their uploads). This makes merchant info + the upload id available for the
  // Receipt tab without the expenses endpoint having to carry receipt fields.
  // The actual upload image (SAS URL) is fetched lazily only when the Receipt
  // tab is opened.
  // immediate: on a cold hard-load the URL already carries ?preview=<id>, so
  // previewExpenseId is born set and never "changes" — without immediate the
  // warm (esp. the receipt fetch) never runs and merchant/receipt skeleton
  // forever. Matches the immediate id-watches in the tab leaves (LLMAnalysis,
  // HistoryTab).
  watch(previewExpenseId, async (id) => {
    if (!id) {
      return
    }
    activeTab.value = 'overview'
    try {
      const expense = await expensesStore.fetchExpense(id)
      if (expense?.receiptId) {
        receiptsStore.fetchReceiptById(expense.receiptId)
      }
    }
    catch (err) {
      // The ?preview id points at an expense that no longer exists (deleted, or
      // a stale/hand-edited URL). Close the preview instead of throwing an
      // unhandled rejection from the watcher.
      console.warn(`[useExpensePreview] could not load preview expense ${id}, closing:`, err)
      isPreviewOpen.value = false
    }
  }, { immediate: true })

  function openPreview (event, row) {
    isPreviewOpen.value = true
    router.replace({ query: { ...route.query, preview: row.original.id } })
  }

  function closePreview () {
    const query = { ...route.query }
    delete query.preview
    router.replace({ query })
  }

  watch(isPreviewOpen, (value) => {
    if (!value) {
      closePreview()
    }
  })

  // If the previewed expense disappears from the store while the panel is open
  // (e.g. it was just deleted), close the preview so ?preview doesn't dangle and
  // re-trigger a 404 fetch. Only acts when an id is set but its expense is gone —
  // not during the brief warm window (the warm watch handles cold-load fetch).
  watch(previewExpense, (expense) => {
    if (isPreviewOpen.value && previewExpenseId.value && !expense) {
      isPreviewOpen.value = false
    }
  })

  // Esc-to-close (the panel has no built-in dismiss handler).
  function onKeydown (event) {
    if (event.key === 'Escape' && isPreviewOpen.value) {
      isPreviewOpen.value = false
    }
  }
  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
  })

  return {
    previewExpenseId,
    previewExpense,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
  }
}
