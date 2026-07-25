<script setup>
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
import { useUploadsStore } from '~/stores/uploads.store'
import { useUploadQueueStore } from '~/stores/upload-queue.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { useReceiptsStore } from '~/stores/receipts.store'
import { useExpensesStore } from '~/stores/expenses.store'

useHead({
  title: 'Uploads',
})

const uploadsStore = useUploadsStore()
const uploadQueueStore = useUploadQueueStore()
const workflowStore = useWorkflowStore()
const receiptsStore = useReceiptsStore()
const expensesStore = useExpensesStore()
uploadsStore.debug = true
workflowStore.debug = true

// Realtime is connected at the layout level (session-scoped), not here — the
// subscription outlives navigation. This page just reads the workflow store it
// feeds. See app/layouts/default.vue.

// Reconcile stuck runs (no worker / expired) against Trigger.dev before
// fetching, so the fetched statuses already reflect reality. Best-effort.
await workflowStore.reconcile()

// Fetch uploads and workflows on mount
await Promise.all([
  uploadsStore.fetchUploads(),
  workflowStore.fetchAll(),
])

// Get reactive refs from store (preserves reactivity without creating new computed)
// eslint-disable-next-line no-unused-vars
const { uploads, loading: pending, error } = storeToRefs(uploadsStore)
const { uploads: queueUploads } = storeToRefs(uploadQueueStore)

// Queue rows whose blob upload to Azure hasn't finished yet — render them
// alongside DB rows so the user sees in-flight progress immediately. Successful
// uploads self-evict from the queue (see upload-queue.store on-complete remove),
// so id collisions with DB rows shouldn't happen by design.
const inFlightQueueRows = computed(() =>
  queueUploads.value
    .filter(q => q.status !== 'completed')
    .map(q => ({
      id: q.id,
      originalFilename: q.originalFilename,
      size: q.size,
      uploadedAt: null,
      status: q.status,
      receipt: null,
    })),
)

const mergedUploads = computed(() => {
  const merged = new Map()

  // DB rows are the base — they provide canonical fields like size,
  // uploadedAt, receipt link.
  for (const dbRow of uploads.value) {
    merged.set(dbRow.id, dbRow)
  }

  // Queue's status ('queued'/'in-progress'/'failed'/'interrupted') is more
  // current than DB's coarse 'initialized'/'uploaded'/'failed', so it wins
  // on the status field while the queue row exists. A queue row without a
  // matching DB row gets used as-is (brief window between drop and
  // /api/blobs/new returning).
  for (const queueRow of inFlightQueueRows.value) {
    const existing = merged.get(queueRow.id)
    if (existing) {
      merged.set(queueRow.id, { ...existing, status: queueRow.status })
    }
    else {
      merged.set(queueRow.id, queueRow)
    }
  }

  return Array.from(merged.values())
})

const FILTER_OPTIONS = [
  { label: 'All uploads', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Has errors', value: 'errored' },
]
const filterValue = ref('all')

const filteredUploads = computed(() => {
  if (filterValue.value === 'all') return mergedUploads.value
  if (filterValue.value === 'errored') {
    return mergedUploads.value.filter(u => workflowStore.hasErrorsById(u.id))
  }
  // 'completed' — no errors
  return mergedUploads.value.filter(u => !workflowStore.hasErrorsById(u.id))
})

const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})
const sorting = ref([{ id: 'uploadedAt', desc: true }])

function sortableHeader (label) {
  return ({ column }) => {
    const sorted = column.getIsSorted()
    return h(resolveComponent('UButton'), {
      variant: 'ghost',
      color: 'neutral',
      size: 'sm',
      class: '-mx-2',
      onClick: () => column.toggleSorting(),
      label,
      leadingIcon: sorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : sorted === 'desc'
          ? 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
      ui: sorted ? undefined : { leadingIcon: 'text-dimmed' },
    })
  }
}

const columns = [
  {
    accessorKey: 'id',
    header: 'Upload ID',
  },
  {
    accessorKey: 'originalFilename',
    header: 'File',
  },
  {
    accessorKey: 'size',
    header: sortableHeader('Size'),
    cell: ({ row }) => `${formatBytes(row.getValue('size'))}`,
  },
  // {
  //   accessorKey: 'status',
  //   header: 'Upload Status',
  // },
  {
    accessorKey: 'uploadedAt',
    header: sortableHeader('Uploaded'),
  },
  {
    accessorKey: 'workflow',
    header: 'Progress',
  },
  {
    accessorKey: 'actions',
    header: '',
  },
]

// const expanded = ref({})

const tableStyles = {
  base: 'min-w-full',
  th: 'text-toned font-semibold',
  td: 'p-3 align-middle',
  tr: 'hover:bg-elevated/50',
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.id === uploadId.value ? 'bg-primary/10' : '',
  },
}))

const { getRowActions } = useUploadRowActions()

const paginationInfo = computed(() => {
  if (!table.value?.tableApi) return { start: 0, end: 0, total: 0 }

  const state = table.value.tableApi.getState().pagination
  const total = table.value.tableApi.getFilteredRowModel().rows.length
  const start = state.pageIndex * state.pageSize + 1
  const end = Math.min((state.pageIndex + 1) * state.pageSize, total)

  return { start, end, total }
})

// route for the #id-cell NuxtLink (builds its own ?preview query for
// middle-click/copy-link semantics). usePreviewPanel calls useRoute internally
// for its own use; a second call here is fine.
const route = useRoute()

// -------- Preview panel (?preview / open / tab / esc + cross-store warm) --------
// Shared plumbing via usePreviewPanel; the upload-specific warm fetches the
// step-detail sources (annotations on the upload, then receipt → expense) so the
// timeline's expandable bodies (2b) have data. All fetches are cache-aware +
// 404-tolerant, so a standalone/unanalyzed upload yields nulls and those steps
// render collapsed. Page-level composition — stores never reference each other.
//
// The warm derives the receipt id from the freshly-fetched upload record (NOT an
// outer computed), so it's self-contained: `immediate: true` runs it during
// setup, before the previewUpload/previewReceiptId consts below are declared.
const annotations = ref(null)

// resourceId aliased to uploadId — the composable is resource-agnostic; this
// page is domain-specific (see project_design_direction_v1 side-panel naming).
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
    // Annotations live on the upload — fetch regardless of receipt existence.
    annotations.value = await uploadsStore.fetchAnnotationsById(id)

    const upload = await uploadsStore.fetchUploadById(id)
    const receiptId = upload?.receiptId ?? upload?.receipt?.id ?? null
    if (!receiptId) return
    const receipt = await receiptsStore.fetchReceiptById(receiptId)
    if (receipt) {
      await expensesStore.fetchExpenseByReceiptId(receiptId)
    }
  },
})

const previewTabs = [
  { label: 'Workflow', value: 'workflow', slot: 'workflow' },
  { label: 'Image', value: 'image', slot: 'image' },
]

// -------- Workflow-timeline data (real) --------
// Static per-step metadata. Status + timestamps come from the workflow store;
// details/summary are still stubbed (see ⚠️ STEP 2b below). The `stepKey` is
// the workflow_runs column base — `${stepKey}Status`, `${stepKey}StartedAt`,
// `${stepKey}CompletedAt`. The Upload step is special: its status comes from the
// upload row (not workflow_runs) and it has no per-step timestamps.
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

// The upload row currently previewed (for the Upload step's status).
const previewUpload = computed(() =>
  uploadId.value ? mergedUploads.value.find(u => u.id === uploadId.value) : null,
)

// The previewed upload's receipt id, for the reactive receipt/expense getters
// below. (The actual warm — the fetches — runs in usePreviewPanel's warm
// callback above; this is just the id derivation for the getters.)
const previewReceiptId = computed(() => previewUpload.value?.receipt?.id ?? previewUpload.value?.receiptId ?? null)

// Store getters (reactive) for the previewed upload's receipt + expense.
const previewReceipt = computed(() =>
  previewReceiptId.value ? receiptsStore.getReceiptById(previewReceiptId.value) : null,
)
const previewExpense = computed(() =>
  previewReceiptId.value ? expensesStore.getExpenseByReceiptId(previewReceiptId.value) : null,
)

// True while the cross-store warm is in flight: the upload links a receipt but
// it isn't in the store yet. Drives skeletons in both tabs. A standalone upload
// (no receiptId) is NOT warming — it has nothing to fetch and renders at once.
const isPreviewWarming = computed(() => !!previewReceiptId.value && !previewReceipt.value)

// Build the detail rows + summary for a given step from the warmed stores.
// Returns { details?, summary? } — a step with no data returns {} and renders
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
        ],
      }

    case 'createExpense':
      if (!expense) return {}
      return {
        details: [
          { label: 'Amount', value: expense.splitAmount != null ? receiptUtils.formatCurrency(expense.splitAmount, expense.currency) : '—' },
          { label: 'Settled', value: expense.isSettled ? 'Yes' : 'No' },
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

// Real steps for the previewed upload's latest run. Status from stepStatusesById,
// timestamps from the run row, detail bodies from the warmed receipt/expense/
// annotations via stepContent().
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

// Run start = the latest run's created_at (shown once at the top).
const timelineRunStartedAt = computed(() => workflowStore.latestRunById(uploadId.value)?.createdAt ?? null)

// The expense the Create Expense footer links to (once warmed).
const previewExpenseId = computed(() => previewExpense.value?.id ?? null)
</script>

<template>
  <!-- min-w-0 so this wrapper (a flex item) can shrink to its share of the row
       instead of overflowing; overflow-hidden clips the resizable preview to the
       available width. Mirrors the expenses list-detail layout. -->
  <div class="flex flex-1 min-w-0 overflow-hidden">
    <UDashboardPanel id="uploads-list" class="min-w-0">
      <template #header>
        <UDashboardNavbar title="Uploads">
          <template #left>
            <UBreadcrumb :items="[{ label: 'Uploads', class: 'font-semibold text-default' }]" />
          </template>
          <template #right>
            <upload-button-modal color="neutral" variant="subtle" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="flex items-center justify-between">
          <p class="text-sm text-dimmed">
            Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} Uploads
          </p>
          <div class="flex items-center gap-2">
            <UButton
              class="cursor-pointer"
              variant="outline"
              color="neutral"
              size="sm"
              @click="uploadsStore.fetchUploads(); workflowStore.fetchAll()"
            >
              Refresh
            </UButton>
            <USelect
              v-model="filterValue"
              :items="FILTER_OPTIONS"
              size="sm"
              class="min-w-[160px]"
            />
          </div>
        </div>

        <ClientOnly>
          <div class="border bg-default border-default">
            <!-- TODO: autoResetPageIndex configuration works now to keep page when deleting items. But it will break as soon as we try to use filters -->
            <UTable
              ref="table"
              v-model:pagination="pagination"
              v-model:sorting="sorting"
              :pagination-options="{
                getPaginationRowModel: getPaginationRowModel(),
                autoResetPageIndex: false,
              }"
              :sorting-options="{
                enableSortingRemoval: false,
              }"
              :data="filteredUploads"
              :columns="columns"
              :meta="tableMeta"
              :ui="tableStyles"
              :loading="pending"
              loading-color="primary"
              loading-animation="carousel"
              class="flex-1"
              @select="openPreview"
            >
              <template #id-cell="{ row }">
                <!-- Keeps the current ?tab (sticky, matches openPreview) so
                     clicking the ID stays on whichever facet you're viewing. -->
                <NuxtLink
                  :to="{ query: { ...route.query, preview: row.original.id, tab: activeTab } }"
                  replace
                  class="text-dimmed hover:text-blue-800 hover:underline font-mono"
                >
                  {{ row.original.id }}
                </NuxtLink>
              </template>

              <!-- <template #status-cell="{ row }">
              <uploads-status-text :status="row.original.status" />
            </template> -->

              <template #originalFilename-cell="{ row }">
                <div
                  class="flex items-center gap-1.5"
                  :class="uploadId ? 'max-w-[200px] md:max-w-[240px] xl:max-w-[320px]' : ''"
                >
                  <UTooltip
                    v-if="row.original.receipt"
                    text="View Receipt"
                    :content="{ side: 'top' }"
                    :delay-duration="0"
                    arrow
                  >
                    <UButton
                      :to="`/receipts/${row.original.receipt.id}`"
                      icon="i-lucide-receipt-euro"
                      size="xs"
                      color="primary"
                      variant="ghost"
                    />
                  </UTooltip>
                  <span :title="row.original.originalFilename" class="truncate">
                    {{ row.original.originalFilename }}
                  </span>
                </div>
              </template>

              <template #uploadedAt-cell="{ row }">
                <time :datetime="row.original.uploadedAt" :title="row.original.uploadedAt">
                  {{ timestampUtils.toShortDatetime(row.original.uploadedAt) }}
                </time>
              </template>

              <template #workflow-cell="{ row }">
                <uploads-workflow-steps
                  :id="row.original.id"
                  :upload-status="row.original.status"
                />
              </template>

              <template #actions-cell="{ row }">
                <UDropdownMenu :items="getRowActions(row)">
                  <UButton
                    icon="i-lucide-ellipsis-vertical"
                    color="neutral"
                    variant="ghost"
                    class="cursor-pointer"
                  />
                </UDropdownMenu>
              </template>
            </UTable>

            <div class="flex justify-between items-center border-t border-default py-4 px-4">
              <div class="text-sm text-toned">
                Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }}
              </div>
              <UPagination
                :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
                :items-per-page="table?.tableApi?.getState().pagination.pageSize"
                :total="table?.tableApi?.getFilteredRowModel().rows.length"
                @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
              />
            </div>
          </div>
        </ClientOnly>
      </template>
    </UDashboardPanel>

    <!-- Resizable preview panel. Mirrors expenses' PreviewPanel.vue: a RIGHT-side
         UDashboardSidebar (not UDashboardPanel) so the resize handle sits on its
         LEFT edge and it holds a remembered width, letting the table panel flex
         to full width when this closes. Own UDashboardGroup for an ISOLATED
         collapse context (two sidebars sharing a group's sidebarCollapsed ref
         clobber each other). unit="rem" matches the app group's resize math.

         Two-tab panel (Workflow · Image). Both the selected upload (?preview=<id>)
         and the active tab (?tab=<tab>) are URL-backed via usePreviewPanel, so
         the panel is deep-linkable + refresh-stable. -->
    <UDashboardGroup v-if="isPreviewOpen" unit="rem" class="contents">
      <UDashboardSidebar
        id="upload-preview"
        side="right"
        resizable
        :default-size="28"
        :min-size="22"
        :max-size="48"
        :ui="{
          root: 'overflow-hidden min-w-0',
          header: 'h-auto py-3 items-start min-w-0',
          body: 'overflow-hidden min-h-0 min-w-0 p-0',
        }"
      >
        <template #header>
          <!-- Title (neutral). Subtitle row: filename, then a separator + the
               relative upload time (tooltip → full date w/ tz on hover). The
               timestamp sits next to the filename, not pushed to the right edge. -->
          <div class="w-full min-w-0 pl-2">
            <div class="flex items-center gap-2 min-w-0">
              <p class="font-bold flex-1 min-w-0 truncate text-default">
                Workflow Preview
              </p>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                aria-label="Close preview"
                class="shrink-0"
                @click="closePreview"
              />
            </div>
            <div class="flex items-baseline gap-1.5 min-w-0 text-xs text-dimmed">
              <span class="font-mono truncate">
                Upload ID: {{ previewUpload?.id || 'Upload' }}
              </span>
              <template v-if="previewUpload?.uploadedAt">
                <span class="shrink-0" aria-hidden="true">·</span>
                <UTooltip
                  :text="dateUtils.formatDate(new Date(previewUpload.uploadedAt))"
                  :delay-duration="0"
                >
                  <time
                    :datetime="previewUpload.uploadedAt"
                    class="shrink-0 tabular-nums"
                  >
                    {{ timestampUtils.toRelative(previewUpload.uploadedAt) }}
                  </time>
                </UTooltip>
              </template>
            </div>
          </div>
        </template>

        <template #default>
          <!-- Two facets of one upload as tabs (activeTab is URL-backed via
               ?tab= — see usePreviewPanel). Workflow = the pipeline timeline;
               Image = the receipt image + OCR/analysis. Same :ui as the expenses
               preview: fixed tab list on top, scrolling content below (min-h-0
               on the root + content is load-bearing). -->
          <UTabs
            v-model="activeTab"
            :items="previewTabs"
            size="md"
            variant="link"
            color="primary"
            :ui="{
              indicator: 'border-b-3 border-primary',
              trigger: 'cursor-pointer',
              root: 'flex flex-col h-full min-h-0 w-full gap-0',
              list: 'shrink-0 px-4 gap-4',
              content: 'flex-1 overflow-y-auto min-h-0',
            }"
          >
            <template #workflow>
              <!-- Skeleton while the cross-store warm is in flight (receipt/
                   expense not yet loaded). Once warm, the real timeline renders
                   with its detail bodies. -->
              <div v-if="isPreviewWarming" class="p-4 space-y-3">
                <USkeleton v-for="n in 6" :key="n" class="h-12 w-full" />
              </div>
              <UploadWorkflowTimeline
                v-else
                :steps="timelineSteps"
                :run-started-at="timelineRunStartedAt"
              >
                <!-- Create Expense step footer: link to the created expense.
                     Enabled once the expense is warmed (upload → receipt →
                     expense); disabled while null (standalone/not-yet-created). -->
                <template #footer-createExpense>
                  <UButton
                    label="View expense"
                    trailing-icon="i-lucide-arrow-right"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                    :to="previewExpenseId ? `/expenses?preview=${previewExpenseId}` : undefined"
                    :disabled="!previewExpenseId"
                  />
                </template>
              </UploadWorkflowTimeline>
            </template>

            <template #image>
              <!-- Skeleton while warming; a few bars + an image-shaped block. -->
              <div v-if="isPreviewWarming" class="p-4 space-y-3">
                <USkeleton class="h-5 w-1/2" />
                <USkeleton class="h-4 w-2/3" />
                <USkeleton class="h-4 w-1/3" />
                <USkeleton class="w-full aspect-3/4 rounded-lg" />
              </div>
              <UploadImageTab v-else-if="uploadId" :id="uploadId" />
            </template>
          </UTabs>
        </template>
      </UDashboardSidebar>
    </UDashboardGroup>
  </div>
</template>
