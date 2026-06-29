import { useExpensesStore } from '~/stores/expenses.store'
import { toBerlinShortDate } from '#shared/utils/expense-date.utils.js'
import ConfirmModal from '~/components/ConfirmModal.vue'

/**
 * Batch-action controller for the expenses list: owns the table's row-selection
 * state and the settle / delete handlers (with confirm + toasts).
 *
 * Owned by the page, NOT the expenses store — selection is ephemeral UI state.
 * The store handles the optimistic cache update + reconciliation; this just
 * drives selection, surfaces results, and clears the selection on success.
 *
 * `rowSelection` is bound to the table's `v-model:row-selection`. Because the
 * table's get-row-id returns the expense id, the selection object's keys ARE
 * the selected expense ids.
 *
 * @param {Object} [options]
 * @param {() => any} [options.onMutated] - called after a successful settle or
 *   delete (e.g. to refresh summary cards). Page-specific, so it's injected
 *   rather than baked in — keeps this reusable across both expenses pages.
 * @returns {Object} rowSelection, selectedIds, selectedCount, batchSettle, batchDelete
 */
export function useExpenseBatchActions (options = {}) {
  const { onMutated } = options
  const expensesStore = useExpensesStore()
  const toast = useToast()
  const overlay = useOverlay()
  const confirmModal = overlay.create(ConfirmModal)

  const rowSelection = ref({})
  const selectedIds = computed(() => Object.keys(rowSelection.value))
  const selectedCount = computed(() => selectedIds.value.length)

  function clearSelection () {
    rowSelection.value = {}
  }

  // A non-success toast (partial or full failure) must stay until the user
  // dismisses it — duration: 0 + an explicit Dismiss action.
  function notifyPersistent ({ title, description, icon, color }) {
    const id = `batch-${title}`
    toast.add({
      id,
      title,
      description,
      icon,
      color,
      orientation: 'vertical',
      duration: 0,
      actions: [
        {
          label: 'Dismiss',
          color: 'neutral',
          variant: 'solid',
          onClick: () => toast.remove(id),
        },
      ],
      ui: {
        title: color === 'error'
          ? 'text-error'
          : 'text-warning',
      },
    })
  }

  async function batchSettle () {
    const ids = selectedIds.value
    if (ids.length === 0) {
      return
    }
    try {
      const result = await expensesStore.markSettled(ids)
      const settled = result.updatedCount
      clearSelection()
      await onMutated?.()

      if (settled === ids.length) {
        toast.add({
          title: 'Expenses settled',
          description: `Marked ${settled} expense(s) as settled`,
          icon: 'i-lucide-square-check-big',
          color: 'success',
          duration: 2500,
        })
      }
      else if (settled === 0) {
        notifyPersistent({
          title: 'Error - No Expenses Settled',
          description: 'An expense needs a "Paid By" person set before it can be marked as settled.',
          icon: 'i-lucide-triangle-alert',
          color: 'error',
        })
      }
      else {
        notifyPersistent({
          title: 'Warning - Partially settled',
          description: `Marked ${settled} of ${ids.length} expense(s) as settled; the rest were skipped. Check if a "Paid By" person is set or if they were already settled.`,
          icon: 'i-lucide-triangle-alert',
          color: 'warning',
        })
      }
    }
    catch (err) {
      console.error('Failed to batch settle expenses:', err)
      notifyPersistent({
        title: 'Failed to settle',
        description: 'Could not mark the selected expenses as settled. Please try again.',
        icon: 'i-lucide-triangle-alert',
        color: 'error',
      })
    }
  }

  async function batchDelete () {
    const ids = selectedIds.value
    if (ids.length === 0) {
      return
    }

    // Map the selected expenses to ConfirmModal's generic item shape so the
    // user can see exactly what they're about to delete.
    const items = ids.map((id) => {
      const expense = expensesStore.getExpenseById(id)
      return {
        label: expense?.title ?? `Expense ${id}`,
        caption: expense?.date ? toBerlinShortDate(expense.date) : undefined,
        trailing: expense?.splitAmount != null ? receiptUtils.formatAmount(expense.splitAmount) : undefined,
      }
    })

    const confirmed = await confirmModal.open({
      title: 'Confirm Deletion',
      description: 'This permanently deletes the following and cannot be undone.',
      items,
      confirmLabel: `Delete ${ids.length === 1 ? 'expense' : 'expenses'}`,
      confirmColor: 'error',
      confirmIcon: 'i-lucide-trash-2',
    }).result
    if (!confirmed) {
      return
    }

    try {
      const result = await expensesStore.batchDelete(ids)
      const deleted = result.deletedCount
      clearSelection()
      await onMutated?.()

      if (deleted === ids.length) {
        toast.add({
          title: 'Expenses deleted',
          description: `Deleted ${deleted} expense(s)`,
          icon: 'i-lucide-trash-2',
          color: 'success',
          duration: 2500,
        })
      }
      else if (deleted === 0) {
        notifyPersistent({
          title: 'Nothing deleted',
          description: 'None of the selected expenses could be deleted. Please try again.',
          icon: 'i-lucide-triangle-alert',
          color: 'error',
        })
      }
      else {
        notifyPersistent({
          title: 'Partially deleted',
          description: `Deleted ${deleted} of ${ids.length} expense(s). The rest could not be deleted.`,
          icon: 'i-lucide-triangle-alert',
          color: 'warning',
        })
      }
    }
    catch (err) {
      console.error('Failed to batch delete expenses:', err)
      notifyPersistent({
        title: 'Failed to delete',
        description: 'Could not delete the selected expenses. Please try again.',
        icon: 'i-lucide-triangle-alert',
        color: 'error',
      })
    }
  }

  return {
    rowSelection,
    selectedIds,
    selectedCount,
    batchSettle,
    batchDelete,
  }
}
