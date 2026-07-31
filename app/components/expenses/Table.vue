<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { UCheckbox } from '#components'
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
const rowSelection = defineModel('rowSelection', {
  type: Object,
  default: () => ({}),
})

const householdStore = useHouseholdStore()

const selectedCount = computed(() => Object.keys(rowSelection.value).length)

const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

const table = useTemplateRef('table')

const columns = computed(() => [
  {
    id: 'select',
    meta: { class: { th: 'w-[36px] px-2', td: 'w-[36px] px-2' } },
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    // Stop the click bubbling to the row's @select handler so ticking a box
    // doesn't also open the preview panel (Gmail-style: box and row-click are
    // independent).
    cell: ({ row }) => h('div', { onClick: e => e.stopPropagation() }, [
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': value => row.toggleSelected(!!value),
        'ariaLabel': 'Select row',
      }),
    ]),
  },
  {
    accessorKey: 'id',
    header: 'ID',
    meta: { class: { th: 'w-[190px]', td: 'w-[190px]' } },
  },
  {
    id: 'date',
    accessorFn: row => row.date ?? null,
    header: 'Date',
    sortUndefined: 'last',
    meta: { class: { th: 'w-[100px]', td: 'w-[100px]' } },
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
    meta: { class: { th: 'w-[120px] px-2 text-right', td: 'w-[120px] px-2 text-right' } },
  },
  {
    accessorKey: 'userTwoShare',
    header: `${user2Name.value}'s Share`,
    meta: { class: { th: 'w-[120px] px-2 text-right', td: 'w-[120px] px-2 text-right' } },
  },
  {
    accessorKey: 'splitAmount',
    header: 'Split Amount',
    meta: { class: { th: 'w-[120px] px-2 text-right', td: 'w-[120px] px-2 text-right' } },
  },

  {
    accessorKey: 'isSettled',
    header: 'Settled',
    meta: { class: { th: 'w-[124px] text-right', td: 'w-[124px] text-right' } },
  },
  {
    id: 'updated',
    // `lastChange` is merged onto the row by useExpensesTableControls, not
    // returned by /api/expenses. Sorting needs the raw timestamp, so the
    // accessor returns that rather than the object.
    accessorFn: row => row.lastChange?.createdAt ?? null,
    header: 'Updated',
    sortUndefined: 'last',
    meta: { class: { th: 'w-[150px]', td: 'w-[150px]' } },
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
      ? 'bg-elevated/90'
      : '',
  },
}))

// Deep-link awareness: jump to the page holding the previewed row. Shared with
// the uploads table via the composable.
usePreviewRowJump({
  previewId: () => props.previewExpenseId,
  data: () => props.data,
  sorting: () => props.sorting,
  tableApi: () => table.value?.tableApi,
})

// Resolves 'user:<id>' / 'task:<name>' to { isBot, label, avatar } for the
// Updated column's avatar. A computed (not a plain memo) so it re-derives if a
// member's name or avatar changes mid-session.
const changeSource = computed(() => (lastChange) => {
  return describeChangeSource(lastChange?.source ?? null, householdStore)
})

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
        class="flex-1"
        @select="onSelect"
      >
        <!-- Expense ID -->
        <template #id-cell="{ row }">
          <span class="font-mono text-sm">{{ row.original.id }}</span>
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
            class="tabular-nums"
          >
            {{ toBerlinShortDate(row.original.date) }}
          </time>
          <span v-else class="text-dimmed">—</span>
        </template>

        <!-- Expense Total -->
        <template #splitAmount-cell="{ row }">
          <div v-if="row.original.splitAmount != null" class="text-right tabular-nums">
            {{ receiptUtils.formatAmount(row.original.splitAmount) }}
          </div>
          <div v-else class="text-dimmed text-right">
            —
          </div>
        </template>

        <!-- Share #1 -->
        <template #userOneShare-cell="{ row }">
          <div v-if="row.original.userOneShare != null" class="text-right tabular-nums">
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
          <div v-if="row.original.userTwoShare != null" class="text-right tabular-nums">
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

        <!-- Last updated: who + when -->
        <template #updated-cell="{ row }">
          <div v-if="row.original.lastChange" class="flex items-center gap-2">
            <UTooltip :text="changeSource(row.original.lastChange).label" :delay-duration="0">
              <UAvatar
                v-if="changeSource(row.original.lastChange).isBot"
                icon="i-lucide-bot"
                size="3xs"
                class="bg-primary/10 text-primary shrink-0"
                :ui="{ icon: 'size-3' }"
              />
              <UAvatar
                v-else
                :src="changeSource(row.original.lastChange).avatar"
                :alt="changeSource(row.original.lastChange).label"
                size="3xs"
                class="shrink-0"
              />
            </UTooltip>
            <time :datetime="row.original.lastChange.createdAt" class="text-sm text-toned">
              {{ timestampUtils.toRelative(row.original.lastChange.createdAt) }}
            </time>
          </div>
          <span v-else class="text-dimmed">—</span>
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
          <span v-if="selectedCount > 0">{{ selectedCount }} selected &middot; </span>
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
