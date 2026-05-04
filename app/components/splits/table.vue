<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useHouseholdStore } from '~/stores/household.store'

const props = defineProps({
  data: { type: Array, required: true },
  sorting: { type: Array, default: () => [] },
  previewSplitId: { type: [Number, null], default: null },
  pageSize: { type: Number, default: 25 },
  showPagination: { type: Boolean, default: true },
  maxHeight: { type: String, default: '700px' },
})

const emit = defineEmits(['select'])

const householdStore = useHouseholdStore()
const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: props.pageSize,
})

const columns = computed(() => [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    id: 'date',
    accessorFn: row => row.receipt?.date ?? null,
    header: 'Receipt Date',
    sortUndefined: 'last',
  },
  {
    accessorKey: 'title',
    header: 'Receipt',
  },
  {
    accessorKey: 'splitAmount',
    header: 'Split Amount',
    meta: { class: { th: 'text-right' } },
  },
  {
    accessorKey: 'userOneShare',
    header: `${user1Name.value}'s Share`,
    meta: { class: { th: 'text-right' } },
  },
  {
    accessorKey: 'userTwoShare',
    header: `${user2Name.value}'s Share`,
    meta: { class: { th: 'text-right' } },
  },
  {
    accessorKey: 'paidByUserId',
    header: 'Paid By',
  },
  {
    accessorKey: 'isSettled',
    header: 'Settled',
  },
])

const tableStyles = {
  base: 'min-w-full',
  thead: 'bg-slate-50',
  th: 'text-slate-700',
  td: 'align-middle',
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.id === props.previewSplitId
      ? 'bg-primary/10'
      : '',
  },
}))

const paginationInfo = computed(() => {
  if (!table.value?.tableApi) {
    return { start: 0, end: 0, total: 0 }
  }
  const state = table.value.tableApi.getState().pagination
  const total = table.value.tableApi.getFilteredRowModel().rows.length
  const start = state.pageIndex * state.pageSize + 1
  const end = Math.min((state.pageIndex + 1) * state.pageSize, total)
  return { start, end, total }
})

// Clamp pageIndex when filtered data shrinks below the current page.
// (autoResetPageIndex is disabled to avoid resets on unrelated data
// refreshes, so this case is handled manually.)
watch(
  () => props.data?.length ?? 0,
  (total) => {
    if (!table.value?.tableApi) {
      return
    }
    const size = table.value.tableApi.getState().pagination.pageSize
    const lastValidPage = Math.max(0, Math.ceil(total / size) - 1)
    if (pagination.value.pageIndex > lastValidPage) {
      pagination.value.pageIndex = lastValidPage
    }
  },
)

// Auto-jump to the page that contains the previewed row so the highlight is
// visible after a deep-link. Use TanStack's sorted/filtered row model so the
// math accounts for current sort + filters, not raw data order.
watch(
  [() => props.previewSplitId, () => props.data, () => props.sorting, () => table.value?.tableApi],
  ([id, _rows, _sorting, api]) => {
    if (!id || !api) {
      return
    }
    const sortedRows = api.getSortedRowModel().rows
    const index = sortedRows.findIndex(r => r.original.id === id)
    if (index < 0) {
      return
    }
    const size = api.getState().pagination.pageSize
    api.setPageIndex(Math.floor(index / size))
  },
  { immediate: true },
)

function onSelect (event, row) {
  emit('select', event, row)
}
</script>

<template>
  <ClientOnly>
    <div class="border bg-white border-slate-200">
      <UTable
        ref="table"
        v-model:pagination="pagination"
        :sorting="sorting"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
          autoResetPageIndex: false,
        }"
        :data="data"
        :columns="columns"
        :meta="tableMeta"
        :ui="tableStyles"
        sticky
        class="flex-1"
        :style="{ maxHeight }"
        @select="onSelect"
      >
        <template #title-cell="{ row }">
          <NuxtLink
            v-if="row.original.receipt"
            :to="`/receipts/${row.original.receipt.id}`"
            class="text-slate-600 hover:text-blue-800 hover:underline font-medium"
          >
            {{ row.original.receipt.title || row.original.receipt.merchantName || '—' }}
          </NuxtLink>
          <span v-else class="text-slate-400">—</span>
        </template>

        <template #date-cell="{ row }">
          <time
            v-if="row.original.receipt?.date"
            :datetime="row.original.receipt.date"
          >
            {{ timestampUtils.toGermanISODate(row.original.receipt.date) }}
          </time>
          <span v-else class="text-slate-400">—</span>
        </template>

        <template #splitAmount-cell="{ row }">
          <div v-if="row.original.splitAmount != null" class="text-right font-medium">
            {{ receiptUtils.formatCurrency(row.original.splitAmount, 'EUR') }}
          </div>
          <div v-else class="text-slate-400 text-right">
            —
          </div>
        </template>

        <template #userOneShare-cell="{ row }">
          <div v-if="row.original.userOneShare != null" class="text-right font-medium">
            {{ receiptUtils.formatCurrency(row.original.userOneShare, 'EUR') }}
          </div>
          <div v-else class="text-slate-400 text-right">
            -
          </div>
        </template>

        <template #userTwoShare-cell="{ row }">
          <div v-if="row.original.userTwoShare != null" class="text-right font-medium">
            {{ receiptUtils.formatCurrency(row.original.userTwoShare, 'EUR') }}
          </div>
          <div v-else class="text-slate-400 text-right">
            -
          </div>
        </template>

        <template #paidByUserId-cell="{ row }">
          <div class="text-sm">
            {{ householdStore.getMemberFirstName(row.original.paidByUserId) }}
          </div>
        </template>

        <template #isSettled-cell="{ row }">
          <UIcon
            :name="row.original.isSettled ? 'i-lucide-square-check' : 'i-lucide-square'"
            class="size-4"
            :class="row.original.isSettled ? 'text-emerald-600' : 'text-slate-300'"
            :title="row.original.isSettled ? 'Settled Up' : 'Unsettled'"
          />
        </template>
      </UTable>

      <div v-if="showPagination" class="flex justify-between items-center border-t border-default py-4 px-4">
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

      <slot name="footer" />
    </div>
  </ClientOnly>
</template>
