<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUserStore } from '~/stores/user.store'
import { useReceiptsStore } from '~/stores/receipts.store'

useHead({
  title: 'Receipts',
})

const toast = useToast()
const userStore = useUserStore()
const receiptsStore = useReceiptsStore()

// Fetch receipts on mount
await receiptsStore.fetchReceipts()

// Get reactive refs from store (preserves reactivity without creating new computed)
// eslint-disable-next-line no-unused-vars
const { receipts, loading: pending, error } = storeToRefs(receiptsStore)

const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

const columns = [
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
  },
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'isAnalyzed',
    header: 'Status',
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'total',
    header: 'Total',
  },
  {
    accessorKey: 'azureTags',
    header: 'Azure Tags',
  },
  {
    id: 'actions',
    meta: {
      class: {
        td: 'text-right',
      },
    },
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          'content': {
            align: 'end',
          },
          'items': getRowActionItems(row),
          'aria-label': 'Actions dropdown',
        },
        () =>
          h(UButton, {
            'icon': 'i-lucide-ellipsis-vertical',
            'color': 'neutral',
            'variant': 'ghost',
            'aria-label': 'Actions dropdown',
          }),
      )
    },
  },
]

// row = receipt
function getRowActionItems (row) {
  return [
    {
      type: 'label',
      label: 'Actions',
    },
    {
      type: 'separator',
    },
    {
      label: 'Edit',
      to: `/receipts/${row.original.id}/edit`,
      icon: 'i-lucide-edit',
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      onSelect () {
        deleteReceipt(row.original.id, row.original.title, row.original.merchantName)
      },
    },
  ]
}

const highlightTotals = ref(true)
const expanded = ref({})

const tableStyles = {
  base: 'min-w-full',
  thead: 'bg-slate-50',
  th: 'text-slate-700',
  td: 'align-top',
  tr: 'data-[expanded=true]:bg-elevated/50',
}

const deleteReceipt = async (id, title, merchantName) => {
  const displayName = (merchantName)
    ? `Receipt #${id}: ${title} from ${merchantName}`
    : `Receipt #${id}: ${title}`
  if (!confirm(`Are you sure you want to delete "${displayName}"?`)) {
    return
  }

  try {
    await receiptsStore.deleteReceipt(id)
    toast.add({
      title: 'Receipt deleted',
      description: `Successfully deleted ${displayName}`,
      icon: 'i-lucide-receipt-euro',
      color: 'success',
      duration: 1500,
    })
  }
  catch (error) {
    console.error('Failed to delete receipt:', error)
    alert('Failed to delete receipt. Please try again.')
  }
}

function totalsMatch (blobTagsString, total) {
  const tagValue = azureUtils.getReceiptTotalBlobTag(blobTagsString)
  if (total === null || tagValue === null) {
    return null
  }
  return Number(tagValue) === total
}

function highlightTotal (isMatch) {
  if (isMatch === null) {
    return ''
  }
  else if (!highlightTotals.value || isMatch) {
    return ''
  }
  else {
    return 'text-red-400'
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
            Receipts
          </h1>
          <p class="mt-1 text-sm text-slate-400">
            Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} receipts for
            {{ userStore.userId }}
          </p>
        </div>
        <UButton class="px-4 py-2 cursor-pointer" @click="receiptsStore.fetchReceipts()">
          Refresh
        </UButton>
      </div>

      <div class="my-2">
        <UCheckbox v-model="highlightTotals" label="Highlight Totals" />
      </div>

      <ClientOnly>
        <div class="border bg-white border-slate-200 rounded-lg overflow-hidden">
          <UTable
            ref="table"
            v-model:expanded="expanded"
            v-model:pagination="pagination"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel(),
              autoResetPageIndex: false,
            }"
            :data="receipts"
            :columns="columns"
            :ui="tableStyles"
            :loading="pending"
            loading-color="primary"
            loading-animation="carousel"
            class="flex-1"
          >
            <!-- JSON view -->
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

            <!-- Receipt ID w/ Link -->
            <template #id-cell="{ row }">
              <NuxtLink
                :to="`/receipts/${row.original.id}`"
                class="text-slate-400 hover:text-blue-800 hover:underline font-mono"
              >
                #{{ row.original.id }}
              </NuxtLink>
            </template>

            <!-- Title -->
            <template #title-cell="{ row }">
              <h1 class="flex items-center gap-2">
                <NuxtLink :to="`/receipts/${row.original.id}`" class=" text-slate-600 font-semibold hover:text-blue-800 hover:underline">
                  {{ row.original.title || '—' }}
                </NuxtLink>
                <UBadge
                  v-if="!row.original.uploads || row.original.uploads.length === 0"
                  icon="i-lucide-triangle-alert"
                  color="warning"
                  variant="outline"
                >
                  Missing Upload
                </UBadge>
                <UBadge
                  v-if="totalsMatch(row.original.azureTags, row.original.total) === false"
                  icon="i-lucide-euro"
                  color="error"
                  variant="outline"
                >
                  Mismatch
                </UBadge>
              </h1>
              <p class="text-slate-400">
                {{ row.original.merchantName || '-' }}
              </p>
            </template>

            <!-- Receipt Date -->
            <template #date-cell="{ row }">
              <time v-if="row.original.date" :datetime="row.original.date" :title="row.original.date">
                {{ timestampUtils.toShortDate(row.original.date) }}
              </time>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Receipt Total -->
            <template #total-cell="{ row }">
              <div
                v-if="row.original.total != null"
                class="font-medium text-right"
                :class="highlightTotal(totalsMatch(row.original.azureTags, row.original.total))"
              >
                {{ receiptUtils.formatCurrency(row.original.total, row.original.currency || 'EUR') }}
              </div>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Azure Tags -->
            <template #azureTags-cell="{ row }">
              <blob-tags
                v-if="row.original.azureTags"
                :tags="row.original.azureTags"
                :highlight-total="highlightTotals"
                :totals-match="totalsMatch(row.original.azureTags, row.original.total)"
              />
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Analysis Status -->
            <template #isAnalyzed-cell="{ row }">
              <UBadge
                :color="row.original.isAnalyzed ? 'info' : 'neutral'"
                variant="subtle"
              >
                {{ row.original.isAnalyzed ? 'Analyzed' : 'Not Analyzed' }}
              </UBadge>
            </template>
          </UTable>

          <!-- Pagination -->
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
