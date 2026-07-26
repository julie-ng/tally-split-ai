import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { useReceiptsStore } from '~/stores/receipts.store'
import { useExpensesStore } from '~/stores/expenses.store'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'

/**
 * Drives the tabbed upload preview panel (UploadPreviewPanel) on the uploads
 * page. Thin upload-specific wrapper over usePreviewPanel: delegates the
 * ?preview/?tab/open/esc plumbing, supplies the cross-store warm (annotations →
 * receipt → expense), and derives all the panel's data — the previewed upload +
 * its receipt/expense getters, the warming flag, and the workflow timeline steps
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

  // The upload's annotations (gpt-4o) — warmed on open, read by the timeline's
  // handwritten step. Kept local (not a store getter) since it's the slimmed
  // annotations payload, cached in the store but returned by value.
  const annotations = ref(null)

  // Fetch the step-detail sources for an upload: annotations live on the upload;
  // then the linked receipt → its expense. All cache-aware + 404-tolerant, so a
  // standalone/unanalyzed upload yields nulls and those steps render collapsed.
  // The receipt id is derived from the freshly-fetched upload (force-refreshed —
  // a fresh run creates the receipt AFTER the initial warm, so the cached upload
  // row may not carry receiptId yet). Runs on preview-open AND on re-warm below.
  async function warmDetails (id) {
    if (!id) return
    annotations.value = await uploadsStore.fetchAnnotationsById(id)

    // Force-refresh the upload row: a fresh run creates the receipt AFTER the
    // initial warm, so the cached row may lack receiptId. refreshUploadById
    // bypasses the cache and patches state; read the fresh row back from the getter.
    await uploadsStore.refreshUploadById(id)
    const upload = uploadsStore.getUploadById(id)
    const receiptId = upload?.receiptId ?? upload?.receipt?.id ?? null
    if (!receiptId) return
    const receipt = await receiptsStore.fetchReceiptById(receiptId, true)
    if (receipt) {
      await expensesStore.fetchExpenseByReceiptId(receiptId)
    }
  }

  // Generic ?preview/?tab/open/esc plumbing. warm runs on preview-open (and cold
  // load). A live-progressing run also re-warms via the watch below.
  const {
    resourceId: uploadId,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
  } = usePreviewPanel({
    defaultTab: 'workflow',
    tabs: ['workflow', 'image'],
    warm: async (id) => {
      annotations.value = null
      await warmDetails(id)
    },
  })

  // The previewed upload row (from the page's merged list — resolves instantly).
  const previewUpload = computed(() =>
    uploadId.value ? uploads.value.find(u => u.id === uploadId.value) : null,
  )

  // Receipt id for the reactive receipt/expense getters (the fetches run in the
  // warm above; this is just id derivation).
  const previewReceiptId = computed(() =>
    previewUpload.value?.receipt?.id ?? previewUpload.value?.receiptId ?? null,
  )

  const previewReceipt = computed(() =>
    previewReceiptId.value ? receiptsStore.getReceiptById(previewReceiptId.value) : null,
  )
  const previewExpense = computed(() =>
    previewReceiptId.value ? expensesStore.getExpenseByReceiptId(previewReceiptId.value) : null,
  )

  // True while the cross-store warm is in flight: the upload links a receipt but
  // it isn't in the store yet. Drives the tab skeletons. A standalone upload (no
  // receiptId) is NOT warming — nothing to fetch, renders at once.
  const isPreviewWarming = computed(() => !!previewReceiptId.value && !previewReceipt.value)

  const previewExpenseId = computed(() => previewExpense.value?.id ?? null)

  // Re-warm while a live run progresses. The workflow store gets step statuses
  // live via realtime, but the DETAIL sources (receipt, expense, annotations) are
  // created by the pipeline AFTER the initial preview-open warm — so on a fresh
  // run, steps stay non-expandable (no details) until something re-fetches. Watch
  // the run's step-status signature; whenever it changes (a step advanced) and
  // the panel is open, re-pull the details so bodies fill in live. Cache-aware,
  // so this is cheap once everything's loaded. Fixes project_timeline_detail_liveness_gap.
  const runStatusSignature = computed(() => {
    const id = uploadId.value
    if (!id) return null
    const s = workflowStore.stepStatusesById(id)
    const run = workflowStore.latestRunById(id)
    return `${run?.status}|${s.ocrStatus}|${s.annotationsStatus}|${s.normalizeStatus}|${s.createExpenseStatus}|${s.adjustExpenseStatus}`
  })

  watch(runStatusSignature, () => {
    if (isPreviewOpen.value && uploadId.value) {
      warmDetails(uploadId.value)
    }
  })

  // -------- Timeline steps --------
  // Static per-step metadata. `stepKey` is the workflow_runs column base
  // (`${stepKey}Status`, `${stepKey}StartedAt`, `${stepKey}CompletedAt`). The
  // Upload step is special: status comes from the upload row (not workflow_runs)
  // and it has no per-step timestamps.
  const STEP_DEFS = [
    { key: 'upload', stepKey: null, label: 'Upload', description: 'File received' },
    { key: 'ocr', stepKey: 'ocr', label: 'OCR Analysis', description: 'Text extraction (Azure Document Intelligence)' },
    { key: 'annotations', stepKey: 'annotations', label: 'Handwritten analysis', description: 'Detecting initials, circles, strikethroughs (GPT-4o)' },
    { key: 'normalize', stepKey: 'normalize', label: 'Normalize', description: 'Cleaning date, title, filename' },
    { key: 'createExpense', stepKey: 'createExpense', label: 'Create expense', description: 'Expense from receipt total' },
    { key: 'adjustExpense', stepKey: 'adjustExpense', label: 'Adjust expense', description: 'Asymmetric split from annotations' },
  ]

  // Upload-row status → step status for the first circle (mirrors the inline
  // row-cell's uploadStepStatus in uploads/workflow-steps.vue). Accepts DB
  // UPLOAD_STATUS values and queue-side strings.
  function uploadStepStatus (status) {
    switch (status) {
      case 'uploaded': return WORKFLOW_STEP_STATUS.COMPLETED
      case 'in-progress': return WORKFLOW_STEP_STATUS.PROCESSING
      case 'failed':
      case 'interrupted': return WORKFLOW_STEP_STATUS.FAILED
      default: return WORKFLOW_STEP_STATUS.PENDING
    }
  }

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
    previewReceiptId,
    previewExpenseId,
  }
}
