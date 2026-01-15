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
  // {
  //   accessorKey: 'merchantName',
  //   header: 'Merchant',
  // },
  {
    accessorKey: 'receiptDate',
    header: 'Date',
  },
  {
    accessorKey: 'receiptTotal',
    header: 'Total',
  },
  // {
  //   accessorKey: 'receiptTags',
  //   header: 'Tags',
  // },
  {
    accessorKey: 'azureTags',
    header: 'Azure Tags',
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

      <ClientOnly>
        <div class="border bg-white border-slate-200 rounded-lg overflow-hidden">
          <UTable
            ref="table"
            v-model:expanded="expanded"
            v-model:pagination="pagination"
            :paginationOptions="{
              getPaginationRowModel: getPaginationRowModel(),
              autoResetPageIndex: false,
            }"
            :data="receipts"
            :columns="columns"
            :ui="tableStyles"
            :loading="pending"
            loadingColor="primary"
            loadingAnimation="carousel"
            class="flex-1"
          >
            <!-- JSON view -->
            <template #expanded="{ row }">
              <div class="bg-slate-800 p-4">
                <vue-json-pretty
                  :data="row.original"
                  :indent="2"
                  :deep="4"
                  :showIcon="true"
                  :showLength="true"
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
              <NuxtLink :to="`/receipts/${row.original.id}`" class=" text-slate-800 hover:text-blue-800 hover:underline">
                {{ row.original.title || '—' }}
              </NuxtLink>
              <p class="text-slate-400">
                {{ row.original.merchantName || '-' }}
              </p>
            </template>

            <!-- Merchant Name -->
            <!-- <template #merchantName-cell="{ row }">
              <div class="text-slate-800">
                <NuxtLink :to="`/receipts/${row.original.id}`" class="hover:text-blue-800 hover:underline">
                  {{ row.original.merchantName || '—' }}
                </NuxtLink>
              </div>
            </template> -->

            <!-- Receipt Date -->
            <template #receiptDate-cell="{ row }">
              <time v-if="row.original.receiptDate" :datetime="row.original.receiptDate" :title="row.original.receiptDate">
                {{ timestampUtils.toShortDate(row.original.receiptDate) }}
              </time>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Receipt Total -->
            <template #receiptTotal-cell="{ row }">
              <div v-if="row.original.receiptTotal != null" class="font-medium text-right">
                {{ receiptUtils.formatCurrency(row.original.receiptTotal, row.original.receiptCurrency || 'EUR') }}
              </div>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Receipt Tags -->
            <!--
            <template #receiptTags-cell="{ row }">
              <div v-if="row.original.receiptTags" class="flex flex-wrap gap-1">
                <UBadge
                  v-for="(tag, i) in row.original.receiptTags.split(',')"
                  :key="`tag-${i}`"
                  color="info"
                  variant="soft"
                  class="text-slate-400"
                >
                  {{ tag.trim() }}
                </UBadge>
              </div>
              <span v-else class="text-slate-400">—</span>
            </template>
            -->

            <!-- Azure Tags -->
            <template #azureTags-cell="{ row }">
              <AzureBlobTags v-if="row.original.azureTags" :tagsAsString="row.original.azureTags" />
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Analysis Status -->
            <template #isAnalyzed-cell="{ row }">
              <UBadge
                :color="row.original.isAnalyzed ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ row.original.isAnalyzed ? 'Analyzed' : 'Not Analyzed' }}
              </UBadge>
            </template>

            <!-- Actions Column -->
            <template #actions-cell="{ row }">
              <NuxtLink :to="`/receipts/${row.original.id}/edit`">
                <UButton
                  icon="i-lucide-pencil"
                  color="info"
                  variant="solid"
                  class="px-3 py-1 text-sm rounded transition-colors mr-2 cursor-pointer"
                >
                  Edit
                </UButton>
              </NuxtLink>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="outline"
                class="px-3 py-1 rounded transition-colors cursor-pointer"
                @click="deleteReceipt(row.original.id, row.original.title, row.original.merchantName)"
              >
                Delete
              </UButton>
            </template>
          </UTable>

          <!-- Pagination -->
          <div class="flex justify-between items-center border-t border-default py-4 px-4">
            <div class="text-sm text-slate-600">
              Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }}
            </div>
            <UPagination
              :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
              :itemsPerPage="table?.tableApi?.getState().pagination.pageSize"
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
