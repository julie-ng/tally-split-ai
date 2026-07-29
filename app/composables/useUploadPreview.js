import { WORKFLOW_STEP_REGISTRY } from '#shared/enums/workflow-step.js'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { useReceiptsStore } from '~/stores/receipts.store'
import { useExpensesStore } from '~/stores/expenses.store'

/**
 * Drives the tabbed upload preview panel (UploadPreviewPanel) on the uploads
 * page. Thin upload-specific wrapper over usePreviewPanel: delegates the
 * ?preview/?tab/open/esc plumbing, supplies the cross-store load (annotations →
 * receipt → expense), and derives all the panel's data — the previewed upload +
 * its receipt/expense getters, the loading flag, and the workflow timeline steps
 * with their detail bodies.
 *
 * Mirrors useExpensePreview. Call from the uploads page setup; pass the page's
 * merged upload list so `previewUpload` resolves instantly from already-loaded
 * table data (no flash while the store re-fetches).
 *
 * @param {import('vue').Ref<Array>|import('vue').ComputedRef<Array>} uploads -
 *   the page's merged upload list (DB rows + in-flight queue rows).
 * @returns {{
 *   uploadId: import('vue').ComputedRef<string|null>,
 *   isPreviewOpen: import('vue').Ref<boolean>,
 *   activeTab: import('vue').WritableComputedRef<string>,
 *   openPreview: (event: Event, row: { original: { id: string } }) => void,
 *   closePreview: () => void,
 *   previewUpload: import('vue').ComputedRef<object|null>,
 *   isPreviewWarming: import('vue').ComputedRef<boolean>,
 *   timelineSteps: import('vue').ComputedRef<Array>,
 *   timelineRunStartedAt: import('vue').ComputedRef<string|null>,
 *   timelineRunCompletedAt: import('vue').ComputedRef<string|null>,
 *   timelineRunUuid: import('vue').ComputedRef<string|null>,
 *   timelineRunStatus: import('vue').ComputedRef<string|null>,
 *   previewExpenseId: import('vue').ComputedRef<string|null>,
 * }}
 */
export function useUploadPreview (uploads) {
  const uploadsStore = useUploadsStore()
  const workflowStore = useWorkflowStore()
  const receiptsStore = useReceiptsStore()
  const expensesStore = useExpensesStore()

  // Cold loads only — a live run's results arrive by broadcast.
  //
  // ⚠️ SEPARATION OF CONCERNS: this reaches across three stores to fetch on their
  // behalf. Each store should own loading its own resource, driven by the leaf
  // that needs it. Flagged, not fixed.
  async function loadPreviewDetails (id) {
    if (!id) return

    // 404-tolerant: an unanalyzed upload has no annotations, and those steps
    // render collapsed.
    if (!uploadsStore.getAnnotationsById(id)) {
      await uploadsStore.fetchAnnotationsById(id)
    }

    const upload = uploadsStore.getUploadById(id)
    const receiptId = upload?.receiptId ?? upload?.receipt?.id ?? null
    if (!receiptId) return

    const receipt = await receiptsStore.fetchReceiptById(receiptId)
    if (receipt) {
      await expensesStore.fetchExpenseByReceiptId(receiptId)
    }
  }

  // Generic ?preview/?tab/open/esc plumbing.
  const {
    resourceId: uploadId,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
  } = usePreviewPanel({
    defaultTab: 'workflow',
    tabs: ['workflow', 'image'],
    onLoad: loadPreviewDetails,
  })

  // The upload's annotations (gpt-4o), read by the timeline's handwritten step.
  // A store getter, NOT local state: the annotations broadcast (mig 0025's
  // `AFTER UPDATE OF annotations_json` trigger) writes into the store's cache, so
  // step 2's result reaches an open panel with no fetch. Also means no manual
  // reset between rows — it's derived from whichever id is current.
  const annotations = computed(() =>
    uploadId.value ? uploadsStore.getAnnotationsById(uploadId.value) : null,
  )

  // The previewed upload row (from the page's merged list — resolves instantly).
  const previewUpload = computed(() =>
    uploadId.value ? uploads.value.find(u => u.id === uploadId.value) : null,
  )

  // Receipt id for the reactive receipt/expense getters (the fetches run in
  // loadPreviewDetails above; this is just id derivation).
  const previewReceiptId = computed(() =>
    previewUpload.value?.receipt?.id ?? previewUpload.value?.receiptId ?? null,
  )

  const previewReceipt = computed(() =>
    previewReceiptId.value ? receiptsStore.getReceiptById(previewReceiptId.value) : null,
  )
  const previewExpense = computed(() =>
    previewReceiptId.value ? expensesStore.getExpenseByReceiptId(previewReceiptId.value) : null,
  )

  // True while the cross-store load is in flight: the upload links a receipt but
  // it isn't in the store yet. Drives the tab skeletons. A standalone upload (no
  // receiptId) is NOT loading — nothing to fetch, renders at once.
  const isPreviewWarming = computed(() => !!previewReceiptId.value && !previewReceipt.value)

  const previewExpenseId = computed(() => previewExpense.value?.id ?? null)

  // NOTE: a `runStatusSignature` watch used to re-fetch upload → receipt → expense
  // on every step transition, inferring "content changed" from "status changed".
  // Deleted 2026-07-29 (realtime Phase 3) — all four resources now broadcast, so
  // step results arrive as data instead of as a hint to go looking for it.

  // -------- Timeline steps --------
  // The Upload pseudo-step (stepKey null — status comes from the upload row, and
  // it has no workflow_runs columns), then the real steps from the registry.
  // `stepKey` is the workflow_runs column base: `${stepKey}Status`,
  // `${stepKey}StartedAt`, `${stepKey}CompletedAt`.
  const STEP_DEFS = [
    { key: 'upload', stepKey: null, label: 'Upload', description: 'File received' },
    ...WORKFLOW_STEP_REGISTRY.map(step => ({
      key: step.key,
      stepKey: step.key,
      label: step.timelineLabel,
      description: step.description,
    })),
  ]

  // Detail rows + summary for a given step, from the warmed stores. Returns
  // { details?, summary? } — a step with no data returns {} and renders
  // collapsed (the component's isExpandable guards on details/summary presence).
  function stepContent (stepKey) {
    const upload = previewUpload.value
    const receipt = previewReceipt.value
    const expense = previewExpense.value

    switch (stepKey) {
      case null: // Upload
        if (!upload) return {}
        return {
          details: [
            { label: 'File', value: upload.originalFilename },
            { label: 'Size', value: upload.size != null ? formatBytes(upload.size) : '—' },
          ],
        }

      case 'ocr':
        if (!receipt) return {}
        return {
          details: [
            { label: 'Merchant', value: receipt.merchantName || '—' },
            { label: 'Address', value: receipt.merchantAddress || '—' },
            { label: 'Total', value: receipt.total != null ? receiptUtils.formatCurrency(receipt.total, receipt.currency) : '—' },
          ],
        }

      case 'annotations': {
        const data = annotations.value
        if (!data) return {}
        const count = data.annotations?.length ?? 0
        return {
          // The LLM's own note, verbatim.
          summary: data.notes || undefined,
          details: [
            { label: 'Annotations found', value: String(count) },
          ],
        }
      }

      case 'normalize':
        if (!receipt) return {}
        return {
          details: [
            { label: 'Title', value: receipt.title || '—' },
            { label: 'Date', value: receipt.date || '—' },
            { label: 'Receipt ID', value: receipt.id },
          ],
        }

      case 'createExpense':
        if (!expense) return {}
        return {
          details: [
            { label: 'Amount', value: expense.splitAmount != null ? receiptUtils.formatCurrency(expense.splitAmount, expense.currency) : '—' },
            { label: 'Settled', value: expense.isSettled ? 'Yes' : 'No' },
            { label: 'Expense ID', value: expense.id },
          ],
        }

      case 'adjustExpense':
        if (!expense) return {}
        return {
          details: [
            { label: 'Your share', value: expense.userOneShare != null ? receiptUtils.formatCurrency(expense.userOneShare, expense.currency) : '—' },
            { label: 'Their share', value: expense.userTwoShare != null ? receiptUtils.formatCurrency(expense.userTwoShare, expense.currency) : '—' },
          ],
          // ⚠️ The LLM split reasoning lives in the changes/history table
          // (changes.reasoning), not on the expense row — a separate history
          // fetch. Left out of 2b; add if the split-reasoning surface is wanted.
        }

      default:
        return {}
    }
  }

  // Real steps for the previewed upload's latest run. Status from
  // stepStatusesById, timestamps from the run row, detail bodies via stepContent.
  const timelineSteps = computed(() => {
    const id = uploadId.value
    if (!id) return []

    const statuses = workflowStore.stepStatusesById(id)
    const run = workflowStore.latestRunById(id)

    return STEP_DEFS.map((def) => {
      const content = stepContent(def.stepKey)

      if (def.stepKey === null) {
        // Upload step — status from the upload row, no workflow timestamps.
        return {
          key: def.key,
          label: def.label,
          description: def.description,
          status: uploadStepStatus(previewUpload.value?.status),
          startedAt: null,
          completedAt: null,
          ...content,
        }
      }
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        status: statuses[`${def.stepKey}Status`],
        startedAt: run?.[`${def.stepKey}StartedAt`] ?? null,
        completedAt: run?.[`${def.stepKey}CompletedAt`] ?? null,
        ...content,
      }
    })
  })

  // Run start/finish (created_at / completed_at) — for the header duration.
  const timelineRunStartedAt = computed(() => workflowStore.latestRunById(uploadId.value)?.createdAt ?? null)
  const timelineRunCompletedAt = computed(() => workflowStore.latestRunById(uploadId.value)?.completedAt ?? null)

  // The latest run's uuid + status, shown in the timeline header.
  const timelineRunUuid = computed(() => workflowStore.latestRunById(uploadId.value)?.uuid ?? null)
  const timelineRunStatus = computed(() => workflowStore.latestRunById(uploadId.value)?.status ?? null)

  // Retry: re-trigger the whole pipeline for the previewed upload. canRetry when
  // the run errored/failed/expired; isRetryExpired flags the "no worker ran it"
  // case. The timeline is a dumb leaf, so the retry logic lives here (the owner).
  const canRetry = computed(() => !!uploadId.value && workflowStore.hasErrorsById(uploadId.value))
  const isRetryExpired = computed(() => !!uploadId.value && workflowStore.isExpiredById(uploadId.value))
  const isRetrying = ref(false)

  async function retry () {
    if (!uploadId.value) return
    isRetrying.value = true
    try {
      await workflowStore.triggerWorkflow(uploadId.value)
    }
    finally {
      isRetrying.value = false
    }
  }

  return {
    uploadId,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
    previewUpload,
    isPreviewWarming,
    timelineSteps,
    timelineRunStartedAt,
    timelineRunCompletedAt,
    timelineRunUuid,
    timelineRunStatus,
    canRetry,
    isRetryExpired,
    isRetrying,
    retry,
    previewReceiptId,
    previewExpenseId,
  }
}
