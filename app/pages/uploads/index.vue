<script setup>
import { h, resolveComponent } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { WORKFLOW_STEP_STATUS } from '#shared/enums/workflow-status.js'
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
    tr: row => row?.original?.id === previewId.value ? 'bg-primary/10' : '',
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

// -------- MOCK workflow-timeline data --------
// ⚠️ STEP 2 (after DB schema change + migration): replace MOCK_STEPS with a
// computed that maps the real workflow store → this step shape, e.g.
//   mapWorkflowToSteps(workflowStore, previewId.value)
// Lifted up here (out of the timeline component) so the component stays a
// props-driven leaf. What's still faked and needs real wiring in step 2:
//   • per-step startedAt/completedAt — NO per-step timestamp columns exist on
//     workflow_runs yet (only run-level created_at/completed_at). These mock
//     times exist purely so durations render for the visual.
//   • details / summary — sourced from receipt/expense rows, NOT workflow_runs.
//   • the Create Expense footer button's :to target (see template below).
// Statuses use the real WORKFLOW_STEP_STATUS enum so every visual state shows.
const MOCK_RUN_STARTED_AT = '2026-07-22T10:21:00'
const MOCK_STEPS = [
  {
    key: 'upload',
    label: 'Upload',
    description: 'File received',
    status: WORKFLOW_STEP_STATUS.COMPLETED,
    startedAt: '2026-07-22T10:21:00',
    completedAt: '2026-07-22T10:21:03',
    details: [
      { label: 'File', value: 'Scanned_20260629-1611-03.jpg' },
      { label: 'Size', value: '343 KB' },
    ],
  },
  {
    key: 'ocr',
    label: 'OCR Analysis',
    description: 'Text extraction (Azure Document Intelligence)',
    status: WORKFLOW_STEP_STATUS.COMPLETED,
    startedAt: '2026-07-22T10:21:04',
    completedAt: '2026-07-22T10:21:10',
    details: [
      { label: 'Merchant', value: 'EDEKA Yilmaz' },
      { label: 'Address', value: 'Lerchenauer Str. 3, 80809 München' },
      { label: 'Line items', value: '14' },
      { label: 'Total', value: '€41.95' },
    ],
  },
  {
    key: 'annotations',
    label: 'Handwritten analysis',
    description: 'Detecting initials, circles, strikethroughs (GPT-4o)',
    status: WORKFLOW_STEP_STATUS.COMPLETED,
    startedAt: '2026-07-22T10:21:10',
    completedAt: '2026-07-22T10:21:16',
    summary: 'No handwritten annotations were detected to indicate who paid, and the total remains unchanged. The adjusted total is split evenly between the household members.',
    details: [
      { label: 'Initials found', value: 'None' },
      { label: 'Strikethroughs', value: '0' },
      { label: 'Confidence', value: '0.92' },
    ],
  },
  {
    key: 'normalize',
    label: 'Normalize',
    description: 'Cleaning date, title, filename',
    status: WORKFLOW_STEP_STATUS.PROCESSING,
    // MOCK: pin ~4s before load so the live elapsed counter reads a small number
    // instead of hours. Real data won't need this. ⚠️ STEP 2.
    startedAt: new Date(Date.now() - 4000).toISOString(),
    completedAt: null,
    details: null,
  },
  {
    key: 'createExpense',
    label: 'Create expense',
    description: 'Expense from receipt total',
    status: WORKFLOW_STEP_STATUS.PENDING,
    startedAt: null,
    completedAt: null,
    // Mock rows so the Create Expense footer (link-to-expense button) has a body
    // to sit under while iterating on the visual. ⚠️ STEP 2: real details.
    details: [
      { label: 'Amount', value: '€41.95' },
      { label: 'Split', value: '50 / 50' },
    ],
  },
  {
    key: 'adjustExpense',
    label: 'Adjust expense',
    description: 'Asymmetric split from annotations',
    status: WORKFLOW_STEP_STATUS.SKIPPED,
    startedAt: null,
    completedAt: null,
    details: null,
  },
]

// -------- Slideover preview --------
// URL state: ?preview=<id> is the single source of truth. The slideover
// component reads :id and opens itself. Use router.replace so the
// slideover doesn't pollute browser history.
const route = useRoute()
const router = useRouter()

const previewId = computed(() => route.query.preview ?? null)

function openPreview (event, row) {
  // console.log('openPreview()', row)
  const id = row.original.id
  router.replace({ query: { ...route.query, preview: id } })
}

function closePreview () {
  const query = { ...route.query }
  delete query.preview
  router.replace({ query })
}
</script>

<template>
  <UDashboardPanel id="uploads-list">
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
              <NuxtLink
                :to="{ query: { ...route.query, preview: row.original.id } }"
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
                :class="previewId ? 'max-w-[200px] md:max-w-[240px] xl:max-w-[320px]' : ''"
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

  <!-- MOCK: existing image/OCR slideover temporarily disabled so it doesn't
       overlap the WorkflowTimeline mock below. Restore when done. -->
  <!-- <upload-preview-panel
    :id="previewId"
    @close="closePreview"
  /> -->

  <!-- MOCK: WorkflowTimeline visual preview. Temporary fixed right-side panel so
       we can iterate on the look. Shows when a row is selected (?preview=<id>).
       ⚠️ STEP 3: not the final placement — this becomes a tab in the single
       resizable preview panel (alongside the image/OCR preview). -->
  <div
    v-if="previewId"
    class="fixed right-0 top-0 z-50 h-screen w-[380px] overflow-y-auto border-l border-default bg-default shadow-xl"
  >
    <div class="flex items-center justify-between border-b border-default px-4 py-3">
      <span class="text-xs font-mono text-dimmed">MOCK · {{ previewId }}</span>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="closePreview"
      />
    </div>
    <UploadWorkflowTimeline
      :steps="MOCK_STEPS"
      :run-started-at="MOCK_RUN_STARTED_AT"
    >
      <!-- Create Expense step footer: link to the created expense. ⚠️ STEP 2:
           the expense id isn't in workflow data — this is a placeholder. Wire
           :to="`/expenses?preview=${expenseId}`" once the expense store is
           composed in (upload → receipt → expense relation). -->
      <template #footer-createExpense>
        <UButton
          label="View expense"
          trailing-icon="i-lucide-arrow-right"
          size="xs"
          color="neutral"
          variant="subtle"
          disabled
        />
      </template>
    </UploadWorkflowTimeline>
  </div>
</template>
