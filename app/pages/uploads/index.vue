<script setup>
import { useUploadsStore } from '~/stores/uploads.store'
import { useUploadQueueStore } from '~/stores/upload-queue.store'
import { useWorkflowStore } from '~/stores/workflow.store'

useHead({
  title: 'Uploads',
})

const uploadsStore = useUploadsStore()
const uploadQueueStore = useUploadQueueStore()
const workflowStore = useWorkflowStore()
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

const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})
const sorting = ref([{ id: 'uploadedAt', desc: true }])

// Batch delete: composable owns row-selection + the handler (confirm, toasts,
// optimistic store update + receipt eviction). Refresh the workflow list after
// a delete so removed runs disappear from the store.
const {
  rowSelection,
  selectedCount,
  batchDelete,
} = useUploadBatchActions({ onMutated: () => workflowStore.fetchAll() })

// Pagination bounds derived from the filtered data + current page state (no
// tableApi dependency, so it stays correct now the table owns its own tableApi).
// `filteredUploads` already reflects the active filter. Mirrors the expenses
// page's paginationInfo shape.
const paginationInfo = computed(() => {
  const total = filteredUploads.value.length
  if (total === 0) {
    return { start: 0, end: 0, total: 0 }
  }
  const { pageIndex, pageSize } = pagination.value
  const start = pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, total)
  return { start, end, total }
})

// Clamp pageIndex when filtered data shrinks below the current page (e.g. after
// a batch delete or filter change). Mirrors useExpensesTableControls.
watch(
  () => filteredUploads.value.length,
  (total) => {
    const { pageIndex, pageSize } = pagination.value
    const lastValidPage = Math.max(0, Math.ceil(total / pageSize) - 1)
    if (pageIndex > lastValidPage) {
      pagination.value.pageIndex = lastValidPage
    }
  },
)

// -------- Preview panel --------
// All the panel's plumbing + data (?preview/?tab URL sync, cross-store warm,
// timeline steps, warming flag) lives in useUploadPreview. The page passes the
// merged list so previewUpload resolves instantly, then wires openPreview to the
// table + these values as props to <UploadPreviewPanel>.
// closePreview isn't destructured — the panel closes via v-model:open, which
// flips isPreviewOpen (usePreviewPanel then clears the URL).
const {
  uploadId,
  isPreviewOpen,
  activeTab,
  openPreview,
  previewUpload,
  isPreviewWarming,
  timelineSteps,
  timelineRunStartedAt,
  timelineRunCompletedAt,
  timelineRunUuid,
  timelineRunStatus,
  previewExpenseId,
} = useUploadPreview(mergedUploads)
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
            <UploadButtonModal color="neutral" variant="subtle" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <!-- Toolbar + table wrapped in one div so they're a SINGLE child of the
             dashboard body — otherwise the body's flex `gap-6` opens a gap
             between them. Mirrors the expenses page structure. -->
        <div>
          <UploadsToolbar
            v-model:filter-value="filterValue"
            :filter-options="FILTER_OPTIONS"
            :pagination-info="paginationInfo"
            :selected-count="selectedCount"
            class="mb-3"
            @refresh="uploadsStore.fetchUploads(); workflowStore.fetchAll()"
            @batch-delete="batchDelete"
          />

          <UploadsTable
            v-model:pagination="pagination"
            v-model:sorting="sorting"
            v-model:row-selection="rowSelection"
            :data="filteredUploads"
            :preview-id="uploadId"
            :active-tab="activeTab"
            :pagination-info="paginationInfo"
            :loading="pending"
            @select="openPreview"
          />
        </div>
      </template>
    </UDashboardPanel>

    <!-- Resizable preview panel. Behaviour + data in useUploadPreview; layout in
         the component. Mirrors expenses' list-detail split. -->
    <UploadPreviewPanel
      v-model:open="isPreviewOpen"
      v-model:active-tab="activeTab"
      :upload-id="uploadId"
      :upload="previewUpload"
      :steps="timelineSteps"
      :run-started-at="timelineRunStartedAt"
      :run-completed-at="timelineRunCompletedAt"
      :run-uuid="timelineRunUuid"
      :run-status="timelineRunStatus"
      :warming="isPreviewWarming"
      :expense-id="previewExpenseId"
    />
  </div>
</template>
