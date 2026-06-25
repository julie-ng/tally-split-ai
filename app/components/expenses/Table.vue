<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useHouseholdStore } from '~/stores/household.store'
import { toBerlinISODate, toBerlinShortDate } from '#shared/utils/expense-date.utils.js'

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
    header: 'ID',
    meta: { class: { th: 'w-[80px]', td: 'w-[80px]' } },
  },
  {
    id: 'date',
    accessorFn: row => row.date ?? null,
    header: 'Date',
    sortUndefined: 'last',
    meta: { class: { th: 'w-[80px]', td: 'w-[80px]' } },
  },
  // {
  //   accessorKey: 'paidByUserId',
  //   header: 'Paid',
  //   meta: { class: { th: 'w-[36px] px-0', td: 'w-[36px] px-0' } },
  // },
  {
    accessorKey: 'title',
    header: 'Expense',
  },

  {
    accessorKey: 'userOneShare',
    header: `${user1Name.value}'s Share`,
    meta: { class: { th: 'w-[124px] px-2 text-right', td: 'w-[124px] px-2 text-right' } },
  },
  {
    accessorKey: 'userTwoShare',
    header: `${user2Name.value}'s Share`,
    meta: { class: { th: 'w-[124px] px-2 text-right', td: 'w-[124px] px-2 text-right' } },
  },
  {
    accessorKey: 'splitAmount',
    header: 'Total',
    meta: { class: { th: 'w-[100px] px-2 text-right', td: 'w-[100px] px-2 text-right' } },
  },

  {
    accessorKey: 'isSettled',
    header: 'Settled',
    meta: { class: { th: 'w-[124px] text-right', td: 'w-[124px] text-right' } },
  },
])

const tableStyles = {
  base: 'min-w-full',
  th: 'text-highlighted font-medium',
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
  [
    () => props.previewExpenseId,
    () => props.data, () => props.sorting,
    () => table.value?.tableApi,
  ],
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
    <div class="border bg-default border-default rounded">
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
        <!-- Expense ID -->
        <template #id-cell="{ row }">
          <UTooltip :text="row.original.id" :delay-duration="0">
            {{ row.original.id.slice(0, 6) }}
          </UTooltip>
        </template>

        <!-- Expense Title -->
        <template #title-cell="{ row }">
          <UTooltip :text="`Paid by ${householdStore.getMemberFirstName(row.original.paidByUserId)}`" :delay-duration="0">
            <UAvatar
              :src="householdStore.getMemberAvatarUrl(row.original.paidByUserId)"
              :alt="householdStore.getMemberFirstName(row.original.paidByUserId)"
              size="xs"
              class="mr-3"
            />
          </UTooltip>
          <span class="text-toned font-medium">
            {{ row.original.title }}
          </span>
        </template>

        <!-- Expense Date -->
        <template #date-cell="{ row }">
          <time
            v-if="row.original.date"
            :datetime="toBerlinISODate(row.original.date)"
          >
            {{ toBerlinShortDate(row.original.date) }}
          </time>
          <span v-else class="text-dimmed">—</span>
        </template>

        <!-- Expense Total -->
        <template #splitAmount-cell="{ row }">
          <div v-if="row.original.splitAmount != null" class="text-right font-semibold text-toned">
            {{ receiptUtils.formatAmount(row.original.splitAmount) }}
          </div>
          <div v-else class="text-dimmed text-right">
            —
          </div>
        </template>

        <!-- Share #1 -->
        <template #userOneShare-cell="{ row }">
          <div v-if="row.original.userOneShare != null" class="text-right font-medium">
            {{ receiptUtils.formatAmount(row.original.userOneShare) }}
            <!-- <UBadge
              :label="householdStore.userOneInitials"
              color="neutral"
              variant="soft"
              size="sm"
              class="ml-1 text-dimmed"
            /> -->
          </div>
          <div v-else class="text-dimmed text-right">
            —
          </div>
        </template>

        <!-- Share #2 -->
        <template #userTwoShare-cell="{ row }">
          <div v-if="row.original.userTwoShare != null" class="text-right font-medium">
            {{ receiptUtils.formatAmount(row.original.userTwoShare) }}
            <!-- <UBadge
              :label="householdStore.userTwoInitials"
              color="neutral"
              variant="soft"
              size="sm"
              class="ml-1 text-dimmed"
            /> -->
          </div>
          <div v-else class="text-dimmed text-right">
            —
          </div>
        </template>

        <!-- Paid By -->
        <template #paidByUserId-cell="{ row }">
          <UTooltip :text="`Paid by ${householdStore.getMemberFirstName(row.original.paidByUserId)}`" :delay-duration="0">
            <UAvatar
              :src="householdStore.getMemberAvatarUrl(row.original.paidByUserId)"
              :alt="householdStore.getMemberFirstName(row.original.paidByUserId)"
              size="xs"
            />
          </UTooltip>
        </template>

        <!-- Settled status -->
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
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>

      <slot name="footer" />
    </div>
  </ClientOnly>
</template>
