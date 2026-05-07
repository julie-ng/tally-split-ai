<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { UCheckbox } from '#components'
import { useHouseholdStore } from '~/stores/household.store'

const props = defineProps({
  data: {
    type: Array,
    required: true,
  },
  sorting: {
    type: Array,
    default: () => [],
  },
  previewSplitId: {
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
  maxHeight: {
    type: String,
    default: '700px',
  },
})

const emit = defineEmits(['select'])
const pagination = defineModel('pagination', {
  type: Object,
  default: () => ({ pageIndex: 0, pageSize: 25 }),
})
const rowSelection = defineModel('rowSelection', {
  type: Object,
  default: () => ({}),
})

function isSettleable (split) {
  return !split.isSettled && !!split.paidByUserId
}

const route = useRoute()
const householdStore = useHouseholdStore()
const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

const table = useTemplateRef('table')

const columns = computed(() => [
  {
    id: 'select',
    header: '',
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': row.getIsSelected(),
      'disabled': !isSettleable(row.original),
      'onUpdate:modelValue': value => row.toggleSelected(!!value),
      'ariaLabel': 'Select row',
      'onClick': e => e.stopPropagation(),
    }),
  },
  {
    accessorKey: 'id',
    header: 'Split ID',
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
        v-model:row-selection="rowSelection"
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
        sticky
        class="flex-1"
        :style="{ maxHeight }"
        @select="onSelect"
      >
        <template #id-cell="{ row }">
          <NuxtLink
            :to="{ query: { ...route.query, preview: row.original.id } }"
            replace
            class="text-slate-400 hover:text-blue-800 hover:underline font-mono"
          >
            {{ row.original.id }}
          </NuxtLink>
        </template>

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
