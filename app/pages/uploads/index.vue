<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUserStore } from '~/stores/user.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { useWorkflowStore } from '~/stores/workflow.store'
import { UPLOAD_STATUS } from '~~/shared/enums/upload-status.js'

useHead({
  title: 'Uploads',
})

const userStore = useUserStore()
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

const deleteUpload = async (hashId, title, blobName) => {
  if (!confirm(`Are you sure you want to delete '${title}' (${blobName})?`)) {
    return
  }

  try {
    await uploadsStore.deleteUpload(hashId)
  }
  catch (error) {
    console.error('Failed to delete upload:', error)
    alert('Failed to delete upload. Please try again.')
  }
}

function canAnalyze (upload) {
  return upload.status === UPLOAD_STATUS.UPLOADED
    && !workflowStore.isProcessingByHashId(upload.hashId)
}

function getRowActions (row) {
  return [
    [
      { label: 'Actions', type: 'label' },
      {
        label: 'Details',
        onSelect: () => navigateTo(`/uploads/${row.original.hashId}`),
      },
      {
        label: 'View Receipt',
        disabled: !row.original.receipt,
        onSelect: () => row.original.receipt && navigateTo(`/receipts/${row.original.receipt.id}`),
      },
      {
        label: 'Analyze',
        disabled: !canAnalyze(row.original),
        onSelect: () => workflowStore.triggerWorkflow(row.original.hashId),
      },
    ],
    [
      {
        label: 'Delete',
        onSelect: () => deleteUpload(row.original.hashId, row.original.title, row.original.blobName),
      },
    ],
  ]
}

const paginationInfo = computed(() => {
  if (!table.value?.tableApi) return { start: 0, end: 0, total: 0 }

  const state = table.value.tableApi.getState().pagination
  const total = table.value.tableApi.getFilteredRowModel().rows.length
  const start = state.pageIndex * state.pageSize + 1
  const end = Math.min((state.pageIndex + 1) * state.pageSize, total)

  return { start, end, total }
})
</script>

<template>
  <UContainer>
    <div class="my-5">
      <div class="flex justify-between items-center mb-5">
        <div>
          <h1 class="font-bold text-2xl">
            Uploads
          </h1>
          <p class="mt-1 text-sm text-slate-400">
            Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} database records for
            {{ userStore.userId }}
          </p>
        </div>
        <UButton class="px-4 py-2 cursor-pointer" @click="uploadsStore.fetchUploads(); workflowStore.fetchAll()">
          Refresh
        </UButton>
      </div>

      <ClientOnly>
        <div class="border bg-white border-slate-200 overflow-hidden">
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
            :ui="tableStyles"
            :loading="pending"
            loading-color="primary"
            loading-animation="carousel"
            class="flex-1"
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
    </div>
  </UContainer>
</template>
