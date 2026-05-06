<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { UCheckbox, UDropdownMenu, UButton } from '#components'
import { useReceiptsStore } from '~/stores/receipts.store'

useHead({
  title: 'Receipts',
})

const toast = useToast()
const receiptsStore = useReceiptsStore()

// Use callOnce for SSR + navigation optimization
await callOnce(() => receiptsStore.fetchReceipts(), { mode: 'navigation' })

// Get reactive refs from store
// eslint-disable-next-line no-unused-vars
const { allReceipts: receipts, loading, errors } = storeToRefs(receiptsStore)
const pending = computed(() => loading.value.all || false)
// const error = computed(() => errors.value.all || null) //  ⚠️ TODO: Error handling

const table = useTemplateRef('table')
const rowSelection = ref({})
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

const selectedCount = computed(() => {
  return Object.keys(rowSelection.value).length
})

const columns = [
  {
    id: 'select',
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': value => row.toggleSelected(!!value),
      'ariaLabel': 'Select row',
    }),
  },
  {
    accessorKey: 'id',
    header: 'Receipt ID',
  },
  {
    accessorKey: 'analysisStatus',
    header: 'Status',
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'date',
    header: 'Receipt Date',
  },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: { class: { th: 'text-right' } },
  },
  // {
  //   accessorKey: 'azureTags',
  //   header: 'Azure Tags',
  // },
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
  th: 'text-slate-700',
  td: 'align-top',
  tr: 'hover:bg-elevated/50',
}

const deleteReceipt = async (id, title, merchantName) => {
  const displayName = (merchantName)
    ? `Receipt ${id}: ${title} from ${merchantName}`
    : `Receipt ${id}: ${title}`
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

async function bulkDelete () {
  const selectedRows = table.value?.tableApi?.getFilteredSelectedRowModel().rows || []
  if (selectedRows.length === 0) return

  if (!confirm(`Are you sure you want to delete ${selectedRows.length} receipt(s)?`)) return

  let deleted = 0
  for (const row of selectedRows) {
    try {
      await receiptsStore.deleteReceipt(row.original.id)
      deleted++
    }
    catch (error) {
      console.error(`Failed to delete receipt ${row.original.id}:`, error)
    }
  }

  rowSelection.value = {}
  toast.add({
    title: 'Bulk delete complete',
    description: `Deleted ${deleted} of ${selectedRows.length} receipt(s)`,
    icon: 'i-lucide-trash-2',
    color: deleted === selectedRows.length ? 'success' : 'warning',
    duration: 2000,
  })
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Receipts">
        <template #left>
          <UBreadcrumb :items="[{ label: 'Receipts' }]" />
        </template>
        <template #right>
          <UButton
            v-if="selectedCount > 0"
            color="error"
            variant="subtle"
            class="cursor-pointer"
            icon="i-lucide-trash-2"
            @click="bulkDelete"
          >
            Delete ({{ selectedCount }})
          </UButton>
          <bulk-analyze-button />
          <UButton
            color="neutral"
            variant="subtle"
            class="cursor-pointer"
            icon="i-lucide-refresh-cw"
            @click="receiptsStore.fetchReceipts()"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-sm text-slate-400 mb-4">
        Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} receipts
      </p>

      <div class="my-2">
        <UCheckbox v-model="highlightTotals" label="Highlight Totals" />
      </div>

      <ClientOnly>
        <div class="border bg-white border-slate-200">
          <UTable
            ref="table"
            v-model:row-selection="rowSelection"
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
            <!-- Receipt ID w/ Link -->
            <template #id-cell="{ row }">
              <NuxtLink
                :to="`/receipts/${row.original.id}`"
                class="text-slate-400 hover:text-blue-800 hover:underline font-mono"
              >
                {{ row.original.id }}
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
              <div v-else class="text-slate-400 text-right">
                —
              </div>
            </template>

            <!-- Azure Tags -->
            <!-- <template #azureTags-cell="{ row }">
              <blob-tags
                v-if="row.original.azureTags"
                :tags="row.original.azureTags"
                :highlight-total="highlightTotals"
                :totals-match="totalsMatch(row.original.azureTags, row.original.total)"
              />
              <span v-else class="text-slate-400">—</span>
            </template> -->

            <!-- Analysis Status -->
            <template #analysisStatus-cell="{ row }">
              <UBadge
                :color="badgeStyleHelpers.analysisBadgeColor(row.original.analysisStatus)"
                :variant="badgeStyleHelpers.analysisBadgeVariant(row.original.analysisStatus)"
              >
                {{ row.original.analysisStatus }}
              </UBadge>
            </template>
          </UTable>

          <!-- Pagination -->
          <div class="flex justify-between items-center border-t border-default py-4 px-4">
            <div class="text-sm text-slate-600">
              <span v-if="selectedCount > 0">{{ selectedCount }} selected &middot; </span>
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
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
