import { useUploadsStore } from '~/stores/uploads.store'
import { useReceiptsStore } from '~/stores/receipts.store'
import ConfirmModal from '~/components/ConfirmModal.vue'

/**
 * Batch-action controller for the uploads list: owns the table's row-selection
 * state and the delete handler (with confirm + toasts). Mirrors
 * useExpenseBatchActions, minus settle (uploads have no settle concept).
 *
 * Owned by the page, NOT the uploads store — selection is ephemeral UI state.
 * The store handles the optimistic cache update; this drives selection,
 * surfaces results, and clears the selection on success.
 *
 * `rowSelection` is bound to the table's `v-model:row-selection`. Because the
 * table's get-row-id returns the upload id, the selection object's keys ARE the
 * selected upload ids. In-flight queue rows can't be selected (the table
 * disables their checkbox), so every selected id is a real DB upload id.
 *
 * @param {Object} [options]
 * @param {() => any} [options.onMutated] - called after a successful delete
 *   (e.g. to refresh a workflow list). Injected so this stays reusable.
 * @returns {Object} rowSelection, selectedIds, selectedCount, batchDelete
 */
export function useUploadBatchActions (options = {}) {
  const { onMutated } = options
  const uploadsStore = useUploadsStore()
  const receiptsStore = useReceiptsStore()
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

  async function batchDelete () {
    const ids = selectedIds.value
    if (ids.length === 0) {
      return
    }

    // Map the selected uploads to ConfirmModal's generic item shape so the user
    // can see exactly what they're about to delete.
    const items = ids.map((id) => {
      const upload = uploadsStore.getUploadById(id)
      return {
        label: upload?.originalFilename ?? upload?.title ?? `Upload ${id}`,
        caption: upload?.size != null ? formatBytes(upload.size) : undefined,
      }
    })

    const confirmed = await confirmModal.open({
      title: 'Confirm Deletion',
      description: 'This permanently deletes the following upload(s), their receipt, and expense where applicable. This cannot be undone.',
      items,
      confirmLabel: `Delete ${ids.length === 1 ? 'upload' : 'uploads'}`,
      confirmColor: 'error',
      confirmIcon: 'i-lucide-trash-2',
    }).result
    if (!confirmed) {
      return
    }

    try {
      const result = await uploadsStore.batchDelete(ids)
      const deleted = result.deletedCount
      clearSelection()

      // The cascade deletes receipts server-side too; evict them from the
      // receipts store so it doesn't show already-deleted receipts. Page-
      // orchestrated (not store-to-store) per the store-composition rule.
      for (const receiptId of result.deletedReceiptIds ?? []) {
        receiptsStore.evictReceipt(receiptId)
      }

      await onMutated?.()

      if (deleted === ids.length) {
        toast.add({
          title: 'Uploads deleted',
          description: `Deleted ${deleted} upload(s)`,
          icon: 'i-lucide-trash-2',
          color: 'success',
          duration: 2500,
        })
      }
      else if (deleted === 0) {
        notifyPersistent({
          title: 'Nothing deleted',
          description: 'None of the selected uploads could be deleted. Please try again.',
          icon: 'i-lucide-triangle-alert',
          color: 'error',
        })
      }
      else {
        notifyPersistent({
          title: 'Partially deleted',
          description: `Deleted ${deleted} of ${ids.length} upload(s). The rest could not be deleted.`,
          icon: 'i-lucide-triangle-alert',
          color: 'warning',
        })
      }
    }
    catch (err) {
      console.error('Failed to batch delete uploads:', err)
      notifyPersistent({
        title: 'Failed to delete',
        description: 'Could not delete the selected uploads. Please try again.',
        icon: 'i-lucide-triangle-alert',
        color: 'error',
      })
    }
  }

  return {
    rowSelection,
    selectedIds,
    selectedCount,
    batchDelete,
  }
}
