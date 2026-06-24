<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useHouseholdStore } from '~/stores/household.store'
import { toBerlinISODate, toBerlinDisplayDate } from '#shared/utils/expense-date.utils.js'

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  sorting: {
    type: Array,
    default: () => [],
  },
  previewExpenseId: {
    type: [String, null],
    default: null,
  },
  paginationInfo: {
    type: Object,
    default: () => ({ start: 0, end: 0, total: 0 }),
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['select'])
const pagination = defineModel('pagination', {
  type: Object,
  default: () => ({ pageIndex: 0, pageSize: 25 }),
})

const route = useRoute()
const householdStore = useHouseholdStore()
const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

const table = useTemplateRef('table')

const columns = computed(() => [
  {
    accessorKey: 'id',
    header: 'Expense ID',
  },
  {
    id: 'date',
    accessorFn: row => row.date ?? null,
    header: 'Date',
    sortUndefined: 'last',
  },
  {
    accessorKey: 'title',
    header: 'Receipt',
  },
  {
    accessorKey: 'splitAmount',
    header: 'Expense Amount',
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
  thead: 'bg-muted',
  th: 'text-highlighted',
  td: 'align-middle',
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.id === props.previewExpenseId
      ? 'bg-primary/10'
      : '',
  },
}))

// Auto-jump to the page that contains the previewed row so the highlight is
// visible after a deep-link. Use TanStack's sorted/filtered row model so the
// math accounts for current sort + filters, not raw data order.
watch(
  [() => props.previewExpenseId, () => props.data, () => props.sorting, () => table.value?.tableApi],
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
    <div class="border bg-default border-default">
      <UTable
        ref="table"
        v-model:pagination="pagination"
        :sorting="sorting"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel(),
          autoResetPageIndex: false,
        }"
        :get-row-id="(row) => row.id"
        :data="data"
        :columns="columns"
        :meta="tableMeta"
        :ui="tableStyles"
        class="flex-1"
        @select="onSelect"
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

        <template #title-cell="{ row }">
          <NuxtLink
            v-if="row.original.receipt"
            :to="`/receipts/${row.original.receipt.id}`"
            class="text-toned hover:text-blue-800 hover:underline font-medium"
          >
            {{ row.original.receipt.title || row.original.receipt.merchantName || '—' }}
          </NuxtLink>
          <span v-else class="text-dimmed">—</span>
        </template>

        <template #date-cell="{ row }">
          <time
            v-if="row.original.date"
            :datetime="toBerlinISODate(row.original.date)"
          >
            {{ toBerlinDisplayDate(row.original.date) }}
          </time>
          <span v-else class="text-dimmed">—</span>
        </template>

        <template #splitAmount-cell="{ row }">
          <div v-if="row.original.splitAmount != null" class="text-right font-medium">
            {{ receiptUtils.formatCurrency(row.original.splitAmount, 'EUR') }}
          </div>
          <div v-else class="text-dimmed text-right">
            —
          </div>
        </template>

        <template #userOneShare-cell="{ row }">
          <div v-if="row.original.userOneShare != null" class="text-right font-medium">
            {{ receiptUtils.formatCurrency(row.original.userOneShare, 'EUR') }}
          </div>
          <div v-else class="text-dimmed text-right">
            -
          </div>
        </template>

        <template #userTwoShare-cell="{ row }">
          <div v-if="row.original.userTwoShare != null" class="text-right font-medium">
            {{ receiptUtils.formatCurrency(row.original.userTwoShare, 'EUR') }}
          </div>
          <div v-else class="text-dimmed text-right">
            -
          </div>
        </template>

        <template #paidByUserId-cell="{ row }">
          <div class="text-sm">
            {{ householdStore.getMemberFirstName(row.original.paidByUserId) }}
          </div>
        </template>

        <template #isSettled-cell="{ row }">
          <UBadge v-if="row.original.isSettled" color="success" variant="soft">
            Settled Up
          </UBadge>
          <UBadge v-else color="warning" variant="soft">
            Not settled
          </UBadge>
        </template>
      </UTable>

      <div v-if="showPagination" class="flex justify-between items-center border-t border-default py-4 px-4">
        <div class="text-sm text-toned">
          Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }}
        </div>
        <UPagination
          :page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="paginationInfo.total"
          @update:page="(p) => { pagination.pageIndex = p - 1 }"
        />
      </div>

      <slot name="footer" />
    </div>
  </ClientOnly>
</template>
