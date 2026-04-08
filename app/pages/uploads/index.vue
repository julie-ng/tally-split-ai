<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUserStore } from '~/stores/user.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { UPLOAD_ANALYSIS_STATUS } from '~~/shared/enums/upload-analysis-status.js'

useHead({
  title: 'Uploads',
})

const userStore = useUserStore()
const uploadsStore = useUploadsStore()
uploadsStore.debug = true

// Fetch uploads on mount
await uploadsStore.fetchUploads()

// Get reactive refs from store (preserves reactivity without creating new computed)
// eslint-disable-next-line no-unused-vars
const { uploads, loading: pending, error } = storeToRefs(uploadsStore)

const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

const columns = [
  // {
  //   accessorKey: 'id',
  //   header: '#',
  //   cell: ({row}) => `${row.getValue('id')}`
  // },
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        'color': 'neutral',
        'variant': 'ghost',
        'icon': 'i-lucide-chevron-down',
        'square': true,
        'aria-label': 'Expand',
        'ui': {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : '',
          ],
        },
        'onClick': () => row.toggleExpanded(),
      }),
  }, //
  {
    accessorKey: 'hashId',
    header: 'Hash ID',
  },
  // {
  //   accessorKey: 'receiptDate',
  //   header: 'Receipt Date',
  // },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => `${row.getValue('status')}`,
  },
  // {
  //   accessorKey: 'uploadedAt',
  //   header: 'Uploaded',
  // },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  // {
  //   accessorKey: 'blobName',
  //   header: 'Blob Name',
  // },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ row }) => `${formatBytes(row.getValue('size'))}`,
  },
  {
    accessorKey: 'azureTags',
    header: 'Blob Tags',
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
  },
]

const expanded = ref({})

const tableStyles = {
  base: 'min-w-full',
  thead: 'bg-slate-50',
  th: 'text-slate-700',
  td: 'align-top',
  tr: 'data-[expanded=true]:bg-elevated/50',
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

const analyzeReceipt = async (hashId) => {
  try {
    await $fetch(`/api/analysis/ocr/${hashId}`, {
      method: 'POST',
    })

    // Refresh table to show updated status
    await uploadsStore.fetchUploads()
  }
  catch (error) {
    console.error('Failed to analyze receipt:', error)
    alert('Failed to analyze receipt. Please try again.')
  }
}

const getAnalyzeButtonText = (status) => {
  switch (status) {
    case UPLOAD_ANALYSIS_STATUS.QUEUED: return 'Queued...'
    case UPLOAD_ANALYSIS_STATUS.PROCESSING: return 'Analyzing...'
    case UPLOAD_ANALYSIS_STATUS.COMPLETED: return 'Analyzed'
    case UPLOAD_ANALYSIS_STATUS.FAILED: return 'Retry'
    default: return 'Analyze'
  }
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
        <UButton class="px-4 py-2 cursor-pointer" @click="uploadsStore.fetchUploads()">
          Refresh
        </UButton>
      </div>

      <ClientOnly>
        <div class="border bg-white border-slate-200 rounded-lg overflow-hidden">
          <!-- TODO: autoResetPageIndex configuration works now to keep page when deleting items. But it will break as soon as we try to use filters -->
          <UTable
            ref="table"
            v-model:expanded="expanded"
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
            <template #expanded="{ row }">
              <div class="bg-slate-50 p-4">
                <vue-json-pretty
                  :data="row.original"
                  :indent="2"
                  :deep="4"
                  :show-icon="true"
                  :show-length="true"
                />
              </div>
            </template>
            <template #hashId-cell="{ row }">
              <NuxtLink
                :to="`/uploads/${row.original.hashId}`"
                class="text-slate-400 hover:text-blue-800 hover:underline font-mono"
              >
                {{ row.original.hashId }}
              </NuxtLink>
            </template>
            <template #status-cell="{ row }">
              <UBadge
                :color="badgeStyleHelpers.statusBadgeColor(row.original.status)"
                :variant="badgeStyleHelpers.statusBadgeVariant(row.original.status)"
              >
                {{ row.original.status }}
              </UBadge>
            </template>
            <template #title-cell="{ row }">
              <div class="mb-1 text-slate-800 font-medium">
                <NuxtLink
                  :to="`/uploads/${row.original.hashId}`"
                  class=" hover:text-blue-800 hover:underline"
                >
                  {{ row.original.title }}
                </NuxtLink>
              </div>
              <a :href="row.original.blobUrl" class="font-xs text-slate-400 hover:underline" target="_blank">
                {{ row.original.originalFilename }}
              </a>
            </template>
            <!--
          <template #blobName-cell="{ row }">
            <a
              :href="row.original.blobUrl"
              class="text-slate-700 hover:underline"
              target="_blank">
                {{ row.original.originalFilename }}
            </a>
          </template>
          -->
            <!--
          <template #receiptDate-cell="{ row }">
            <time :datetime="row.original.receiptDate" :title="row.original.receiptDate">
              {{ timestampUtils.toShortDate(row.original.receiptDate) }}
            </time>
          </template>
          -->
            <template #uploadedAt-cell="{ row }">
              <time :datetime="row.original.uploadedAt" :title="row.original.uploadedAt">
                {{ timestampUtils.toShortDatetime(row.original.uploadedAt) }}
              </time>
            </template>
            <template #azureTags-cell="{ row }">
              <div v-if="row.original.azureTags != null">
                <div v-for="tag, i in azureUtils.blobTagsJsonToObject(row.original.azureTags)" :key="`${row.original.hashId}-tag-${tag.key}-${i}`">
                  <UBadge
                    color="info"
                    variant="soft"
                    class="my-1 mr-1 text-slate-400"
                  >
                    {{ tag.key }}: {{ tag.value }}
                  </UBadge>
                </div>
              </div>
            </template>
            <template #actions-cell="{ row }">
              <UButton
                icon="i-lucide-focus"
                loading-icon="i-lucide-loader"
                loading-auto
                :disabled="[UPLOAD_ANALYSIS_STATUS.QUEUED, UPLOAD_ANALYSIS_STATUS.PROCESSING, UPLOAD_ANALYSIS_STATUS.COMPLETED].includes(row.original.analysisStatus)"
                color="info"
                variant="solid"
                class="px-3 py-1 text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-2 cursor-pointer"
                @click="analyzeReceipt(row.original.hashId)"
              >
                {{ getAnalyzeButtonText(row.original.analysisStatus) }}
              </UButton>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="outline"
                class="px-3 py-1 rounded transition-colors cursor-pointer"
                @click="deleteUpload(row.original.hashId, row.original.title, row.original.blobName)"
              >
                Delete
              </UButton>
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

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
