import { useExpensesStore } from '~/stores/expenses.store'
import { useReceiptsStore } from '~/stores/receipts.store'

/**
 * Drives the tabbed expense preview panel (ExpensePreviewPanel) on every expense
 * list page. Thin expense-specific wrapper over usePreviewPanel: delegates the
 * ?preview / open-state / tab / esc plumbing, supplies the expense+receipt load,
 * and adds the expense-specific `previewExpense` getter + disappeared-expense
 * auto-close. Call from page setup.
 *
 * @returns {{
 *   previewExpenseId: import('vue').ComputedRef<string|null>,
 *   previewExpense: import('vue').ComputedRef<object|null>,
 *   isPreviewOpen: import('vue').Ref<boolean>,
 *   activeTab: import('vue').WritableComputedRef<string>,
 *   openPreview: (event: Event, row: { original: { id: string } }) => void,
 *   closePreview: () => void,
 * }}
 */
export function useExpensePreview () {
  const expensesStore = useExpensesStore()
  const receiptsStore = useReceiptsStore()

  // Generic ?preview / open / tab / esc / load plumbing. The expense-specific
  // load: fetch the expense, then load its linked RECEIPT into the receipts
  // store (which owns receipts + their uploads) so merchant info + the upload id
  // are available for the Receipt tab without the expenses endpoint carrying
  // receipt fields. The upload image (SAS URL) is fetched lazily on tab open.
  // A throw here (stale/deleted ?preview id) auto-closes the panel.
  const {
    resourceId: previewExpenseId,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
  } = usePreviewPanel({
    defaultTab: 'overview',
    tabs: ['overview', 'receipt', 'history'],
    ensureLoaded: async (id) => {
      const expense = await expensesStore.fetchExpense(id)
      if (expense?.receiptId) {
        receiptsStore.fetchReceiptById(expense.receiptId)
      }
    },
  })

  const previewExpense = computed(() => previewExpenseId.value
    ? expensesStore.getExpenseById(previewExpenseId.value)
    : null,
  )

  // If the previewed expense disappears from the store while the panel is open
  // (e.g. it was just deleted), close the preview so ?preview doesn't dangle and
  // re-trigger a 404 fetch. Only acts when an id is set but its expense is gone —
  // not during the brief load window (usePreviewPanel's ensureLoaded handles it).
  watch(previewExpense, (expense) => {
    if (isPreviewOpen.value && previewExpenseId.value && !expense) {
      isPreviewOpen.value = false
    }
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
