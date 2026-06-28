import { useExpensesStore } from '~/stores/expenses.store'
import { useReceiptsStore } from '~/stores/receipts.store'

/**
 * Drives the expense preview slideover for a list page.
 *
 * The `?preview=<expenseId>` query param is the single source of truth for
 * *which* expense is previewed; this composable owns that URL sync plus the
 * slideover's open-state. Open-state is deliberately decoupled from the id
 * (seeded once so a cold-load `?preview=<id>` auto-opens, then owned locally) —
 * see app/components/expense/Preview.vue and the blink history: with a non-modal
 * slideover, re-deriving `open` from the id re-triggered repaints.
 *
 * Call from page setup (the page owns the router; this packages the canonical
 * ?preview behavior so every list page doesn't re-implement it).
 *
 * Two presentations share this composable: the older slideover (`/expenses`)
 * and the resizable side-panel (`/expenses/[year]/[month]`). Both drive the same
 * open-state ref — exposed as both `isSlideoverOpen` and `isPreviewOpen` so each
 * page reads naturally. The panel also uses the tab state below.
 *
 * @returns {{
 *   previewExpenseId: import('vue').ComputedRef<string|null>,
 *   previewExpense: import('vue').ComputedRef<object|null>,
 *   isSlideoverOpen: import('vue').Ref<boolean>,
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

  // Seeded once from the URL (cold-load auto-open), then owned locally. NOT a
  // computed off previewExpenseId — that re-coupling is what caused the blink.
  const isSlideoverOpen = ref(!!previewExpenseId.value)

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
    const expense = await expensesStore.fetchExpense(id)
    if (expense?.receiptId) {
      receiptsStore.fetchReceiptById(expense.receiptId)
    }
  }, { immediate: true })

  function openPreview (event, row) {
    isSlideoverOpen.value = true
    router.replace({ query: { ...route.query, preview: row.original.id } })
  }

  function closePreview () {
    const query = { ...route.query }
    delete query.preview
    router.replace({ query })
  }

  watch(isSlideoverOpen, (value) => {
    if (!value) {
      closePreview()
    }
  })

  // `:dismissible="false"` (set on the slideover to fix the blink) also disables
  // esc-to-close, so restore it here.
  function onKeydown (event) {
    if (event.key === 'Escape' && isSlideoverOpen.value) {
      isSlideoverOpen.value = false
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
    isSlideoverOpen,
    isPreviewOpen: isSlideoverOpen, // same ref, panel-friendly name
    activeTab,
    openPreview,
    closePreview,
  }
}
