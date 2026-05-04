<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'

useHead({
  title: 'Uploads',
})

const uploadsStore = useUploadsStore()
const workflowStore = useWorkflowStore()
uploadsStore.debug = true
workflowStore.debug = true

// Fetch uploads and workflows on mount
await Promise.all([
  uploadsStore.fetchUploads(),
  workflowStore.fetchAll(),
])

// Get reactive refs from store (preserves reactivity without creating new computed)
// eslint-disable-next-line no-unused-vars
const { uploads, loading: pending, error } = storeToRefs(uploadsStore)

const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

const columns = [
  {
    accessorKey: 'hashId',
    header: 'ID',
  },
  {
    accessorKey: 'originalFilename',
    header: 'File',
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ row }) => `${formatBytes(row.getValue('size'))}`,
  },
  // {
  //   accessorKey: 'status',
  //   header: 'Upload Status',
  // },
  {
    accessorKey: 'uploadedAt',
    header: 'Uploaded',
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
  th: 'text-slate-600 font-semibold',
  td: 'p-3 align-middle',
  tr: 'hover:bg-elevated/50',
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.hashId === previewHashId.value ? 'bg-primary/10' : '',
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

// -------- Slideover preview --------
// URL state: ?preview=<hashId> is the single source of truth. The slideover
// component reads :hash-id and opens itself. Use router.replace so the
// slideover doesn't pollute browser history.
const route = useRoute()
const router = useRouter()

const previewHashId = computed(() => route.query.preview ?? null)

function openPreview (event, row) {
  // console.log('openPreview()', row)
  const hashId = row.original.hashId
  router.replace({ query: { ...route.query, preview: hashId } })
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
          <UButton class="px-4 py-2 cursor-pointer" variant="subtle" @click="uploadsStore.fetchUploads(); workflowStore.fetchAll()">
            Refresh
          </UButton>
          <upload-button-modal class="px-4 py-2" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-sm text-slate-400">
        Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} Uploads
      </p>

      <ClientOnly>
        <div class="border bg-white border-slate-200">
          <!-- TODO: autoResetPageIndex configuration works now to keep page when deleting items. But it will break as soon as we try to use filters -->
          <UTable
            ref="table"
            v-model:pagination="pagination"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel(),
              autoResetPageIndex: false,
            }"
            :data="uploads"
            :columns="columns"
            :meta="tableMeta"
            :ui="tableStyles"
            :loading="pending"
            loading-color="primary"
            loading-animation="carousel"
            class="flex-1"
            @select="openPreview"
          >
            <template #hashId-cell="{ row }">
              <NuxtLink
                :to="`/uploads/${row.original.hashId}`"
                class="text-slate-400 hover:text-blue-800 hover:underline font-mono"
              >
                {{ row.original.hashId }}
              </NuxtLink>
            </template>

            <!-- <template #status-cell="{ row }">
              <uploads-status-text :status="row.original.status" />
            </template> -->

            <template #originalFilename-cell="{ row }">
              <span class="inline-flex items-center gap-1.5">
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
                {{ row.original.originalFilename }}
              </span>
            </template>

            <template #uploadedAt-cell="{ row }">
              <time :datetime="row.original.uploadedAt" :title="row.original.uploadedAt">
                {{ timestampUtils.toShortDatetime(row.original.uploadedAt) }}
              </time>
            </template>

            <template #workflow-cell="{ row }">
              <uploads-workflow-steps
                :upload-status="row.original.status"
                :hash-id="row.original.hashId"
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
            <div class="text-sm text-slate-600">
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

  <upload-preview-panel
    v-if="previewHashId"
    :hash-id="previewHashId"
    @close="closePreview"
  />
</template>
