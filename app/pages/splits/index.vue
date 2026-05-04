<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useSplitsStore } from '~/stores/splits.store'
import { useHouseholdStore } from '~/stores/household.store'

useHead({
  title: 'Splits',
})

const splitsStore = useSplitsStore()
const householdStore = useHouseholdStore()

const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

// Fetch all splits on mount
await callOnce(() => splitsStore.fetchAllSplits(), { mode: 'navigation' })

// Get reactive refs from store
const { allSplits: splits, loading } = storeToRefs(splitsStore)
const pending = computed(() => loading.value.all || false)

// Fetch summary data
const { data: summary, refresh: refreshSummary } = await useFetch('/api/splits/summary')

// Table setup
const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 25,
})

// -------- Settled filter dropdown --------
const SETTLED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'settled', label: 'Is Settled' },
  { value: 'unsettled', label: 'Not Settled' },
]
const settledFilter = ref('all')

const settledLabel = computed(() => {
  const option = SETTLED_OPTIONS.find(o => o.value === settledFilter.value)
  return option?.label ?? 'All'
})

const settledMenuItems = computed(() => [
  [
    { label: 'Settled', type: 'label' },
    ...SETTLED_OPTIONS.map(o => ({
      label: o.label,
      slot: 'check',
      active: settledFilter.value === o.value,
      onSelect: () => {
        settledFilter.value = o.value
      },
    })),
  ],
])

// -------- Paid By filter dropdown --------
const paidByOptions = computed(() => [
  { value: 'all', label: 'All' },
  { value: householdStore.userOne?.id, label: user1Name.value },
  { value: householdStore.userTwo?.id, label: user2Name.value },
  { value: 'unknown', label: 'Unknown' },
])
const paidByFilter = ref('all')

const paidByLabel = computed(() => {
  const option = paidByOptions.value.find(o => o.value === paidByFilter.value)
  return option?.label ?? 'All'
})

const paidByMenuItems = computed(() => [
  [
    { label: 'Paid By', type: 'label' },
    ...paidByOptions.value.map(o => ({
      label: o.label,
      slot: 'check',
      active: paidByFilter.value === o.value,
      onSelect: () => {
        paidByFilter.value = o.value
      },
    })),
  ],
])

const filteredSplits = computed(() => {
  let result = splits.value

  if (settledFilter.value === 'settled') {
    result = result.filter(s => s.isSettled)
  }
  else if (settledFilter.value === 'unsettled') {
    result = result.filter(s => !s.isSettled)
  }

  if (paidByFilter.value === 'unknown') {
    result = result.filter(s => !s.paidByUserId)
  }
  else if (paidByFilter.value !== 'all') {
    result = result.filter(s => s.paidByUserId === paidByFilter.value)
  }

  return result
})

// -------- Sort dropdown --------
// `sortBy` + `sortOrder` are the user-facing knobs; they drive `sorting`
// (TanStack's model). New sort options just need an entry in SORT_OPTIONS.
const sortOptions = computed(() => [
  { value: 'date', label: 'Receipt Date' },
  { value: 'splitAmount', label: 'Split Amount' },
  { value: 'userOneShare', label: `${user1Name.value}'s Share` },
  { value: 'userTwoShare', label: `${user2Name.value}'s Share` },
])
const sortBy = ref('date')
const sortOrder = ref('desc') // 'desc' | 'asc'

const sorting = computed(() => [{ id: sortBy.value, desc: sortOrder.value === 'desc' }])

const sortLabel = computed(() => {
  const option = sortOptions.value.find(o => o.value === sortBy.value)
  const direction = sortOrder.value === 'desc' ? 'DESC' : 'ASC'
  return option ? `${option.label} · ${direction}` : direction
})

const sortMenuItems = computed(() => [
  [
    { label: 'Sort by', type: 'label' },
    ...sortOptions.value.map(o => ({
      label: o.label,
      slot: 'check',
      active: sortBy.value === o.value,
      onSelect: () => {
        sortBy.value = o.value
      },
    })),
  ],
  [
    { label: 'Order', type: 'label' },
    {
      label: 'ASC',
      slot: 'check',
      active: sortOrder.value === 'asc',
      onSelect: () => {
        sortOrder.value = 'asc'
      },
    },
    {
      label: 'DESC',
      slot: 'check',
      active: sortOrder.value === 'desc',
      onSelect: () => {
        sortOrder.value = 'desc'
      },
    },
  ],
])

const columns = computed(() => [
  // {
  //   accessorKey: 'analysisStatus',
  //   header: 'Analyzed',
  // },
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
  // {
  //   accessorKey: 'receiptTotal',
  //   header: 'Receipt Total',
  // },
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
  // {
  //   id: 'actions',
  //   header: 'Actions',
  // },
  // {
  //   accessorKey: 'filename',
  //   header: 'File',
  // },
])

const tableStyles = {
  base: 'min-w-full',
  thead: 'bg-slate-50',
  th: 'text-slate-700',
  td: 'align-middle',
}

/**
 * Helper to get first upload from receipt
 */
function getFirstUpload (split) {
  return split?.receipt?.uploads?.[0] || null
}

function netBalanceText (summary) {
  return summary.netBalance >= 0
    ? `${user1Name.value} owes`
    : `${user2Name.value} owes`
}

/**
 * Refresh both splits and summary
 */
async function refreshAll () {
  await Promise.all([
    splitsStore.fetchAllSplits(),
    refreshSummary(),
  ])
}

const paginationInfo = computed(() => {
  if (!table.value?.tableApi) return { start: 0, end: 0, total: 0 }

  const state = table.value.tableApi.getState().pagination
  const total = table.value.tableApi.getFilteredRowModel().rows.length
  const start = state.pageIndex * state.pageSize + 1
  const end = Math.min((state.pageIndex + 1) * state.pageSize, total)

  return { start, end, total }
})

// -------- Preview panel --------
// URL state: ?preview=<splitId> is the single source of truth.
const route = useRoute()
const router = useRouter()

const previewSplitId = computed(() => {
  const raw = route.query.preview
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
})

function openPreview (event, row) {
  router.replace({ query: { ...route.query, preview: row.original.id } })
}

function closePreview () {
  const query = { ...route.query }
  delete query.preview
  router.replace({ query })
}

const tableMeta = computed(() => ({
  class: {
    tr: row => row?.original?.id === previewSplitId.value ? 'bg-primary/10' : '',
  },
}))

// On initial load (or when previewSplitId changes), jump to the page that
// contains the previewed row so the highlight is actually visible.
watch([previewSplitId, splits, () => table.value?.tableApi], ([id, rows, api]) => {
  if (!id || !api || !rows?.length) return
  const index = rows.findIndex(s => s.id === id)
  if (index < 0) return
  const pageSize = api.getState().pagination.pageSize
  api.setPageIndex(Math.floor(index / pageSize))
}, { immediate: true })
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Splits">
        <template #left>
          <UBreadcrumb :items="[{ label: 'Splits' }]" />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="subtle"
            class="cursor-pointer"
            icon="i-lucide-refresh-cw"
            @click="refreshAll"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Header -->
      <splits-monthly-header
        title="Splits"
        :pagination-info="paginationInfo"
        @refresh="refreshAll"
      />

      <!-- Summary Cards -->
      <div v-if="summary" class="grid grid-cols-4 gap-4 mb-5">
        <split-card
          :title="`${receiptUtils.formatCurrency(summary.userOneShare, 'EUR')}`"
          :subtitle="`${user1Name}'s Share`"
        />
        <split-card
          :title="`${receiptUtils.formatCurrency(summary.userTwoShare, 'EUR')}`"
          :subtitle="`${user2Name}'s Share`"
        />
        <split-card
          :title="`${receiptUtils.formatCurrency(Math.abs(summary.netBalance), 'EUR')}`"
          :note="netBalanceText(summary)"
          subtitle="Net Balance"
        />
        <split-card
          :title="summary.unsettledCount"
          :note="`${summary.pendingCount} pending`"
          subtitle="Unsettled"
        />
      </div>

      <!-- Toolbar -->
      <div class="flex items-center gap-2 mb-3">
        <UDropdownMenu :items="settledMenuItems">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            leading-icon="i-lucide-square-check"
            trailing-icon="i-lucide-chevron-down"
          >
            Settled · {{ settledLabel }}
          </UButton>

          <template #check-leading="{ item }">
            <UIcon
              name="i-lucide-check"
              class="size-4 shrink-0"
              :class="item.active ? '' : 'invisible'"
            />
          </template>
        </UDropdownMenu>
        <UDropdownMenu :items="paidByMenuItems">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            leading-icon="i-lucide-user"
            trailing-icon="i-lucide-chevron-down"
          >
            Paid By · {{ paidByLabel }}
          </UButton>

          <template #check-leading="{ item }">
            <UIcon
              name="i-lucide-check"
              class="size-4 shrink-0"
              :class="item.active ? '' : 'invisible'"
            />
          </template>
        </UDropdownMenu>
        <UDropdownMenu :items="sortMenuItems">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            leading-icon="i-lucide-arrow-down-wide-narrow"
            trailing-icon="i-lucide-chevron-down"
          >
            {{ sortLabel }}
          </UButton>

          <template #check-leading="{ item }">
            <UIcon
              name="i-lucide-check"
              class="size-4 shrink-0"
              :class="item.active ? '' : 'invisible'"
            />
          </template>
        </UDropdownMenu>
      </div>

      <!-- Table -->
      <ClientOnly>
        <div class="border bg-white border-slate-200">
          <UTable
            ref="table"
            v-model:pagination="pagination"
            v-model:sorting="sorting"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel(),
              autoResetPageIndex: false,
            }"
            :data="filteredSplits"
            :columns="columns"
            :meta="tableMeta"
            :ui="tableStyles"
            :loading="pending"
            loading-color="primary"
            loading-animation="carousel"
            sticky
            class="flex-1 max-h-[800px]"
            @select="openPreview"
          >
            <!-- Analysis Status -->
            <!-- <template #analysisStatus-cell="{ row }">
              <UBadge
                v-if="getFirstUpload(row.original)"
                :color="badgeStyleHelpers.statusBadgeColor(getFirstUpload(row.original).analysisStatus)"
                :variant="badgeStyleHelpers.statusBadgeVariant(getFirstUpload(row.original).analysisStatus)"
              >
                {{ getFirstUpload(row.original).analysisStatus || 'unknown' }}
              </UBadge>
              <span v-else class="text-slate-400">—</span>
            </template> -->

            <!-- Receipt Title -->
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

            <!-- Receipt Date -->
            <template #date-cell="{ row }">
              <time
                v-if="row.original.receipt?.date"
                :datetime="row.original.receipt.date"
              >
                {{ timestampUtils.toGermanISODate(row.original.receipt.date) }}
              </time>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Split Amount (Read-Only) -->
            <template #splitAmount-cell="{ row }">
              <div v-if="row.original.splitAmount != null" class="text-right font-medium">
                {{ receiptUtils.formatCurrency(row.original.splitAmount, 'EUR') }}
              </div>
              <div v-else class="text-slate-400 text-right">
                —
              </div>
            </template>

            <!-- User One Share (Read-Only) -->
            <template #userOneShare-cell="{ row }">
              <div v-if="row.original.userOneShare != null" class="text-right font-medium">
                {{ receiptUtils.formatCurrency(row.original.userOneShare, 'EUR') }}
              </div>
              <div v-else class="text-slate-400 text-right">
                -
              </div>
            </template>

            <!-- User Two Share (Read-Only) -->
            <template #userTwoShare-cell="{ row }">
              <div v-if="row.original.userTwoShare != null" class="text-right font-medium">
                {{ receiptUtils.formatCurrency(row.original.userTwoShare, 'EUR') }}
              </div>
              <div v-else class="text-slate-400 text-right">
                -
              </div>
            </template>

            <!-- Paid By (Read-Only) -->
            <template #paidByUserId-cell="{ row }">
              <div class="text-sm">
                {{ householdStore.getMemberFirstName(row.original.paidByUserId) }}
              </div>
            </template>

            <!-- Is Settled (Read-Only) -->
            <template #isSettled-cell="{ row }">
              <UIcon
                :name="row.original.isSettled ? 'i-lucide-square-check' : 'i-lucide-square'"
                class="size-4"
                :class="row.original.isSettled ? 'text-emerald-600' : 'text-slate-300'"
                :title="row.original.isSettled ? 'Settled Up' : 'Unsettled'"
              />
              <!-- <UBadge
                :color="row.original.isSettled ? 'success' : 'neutral'"
                variant="outline"
              >
                {{ row.original.isSettled ? 'Settled' : 'Unsettled' }}
              </UBadge> -->
            </template>

            <!-- Actions -->
            <!-- <template #actions-cell="{ row }">
              <NuxtLink :to="`/receipts/${row.original.receipt?.id}`">
                <UButton
                  variant="soft"
                  color="primary"
                  size="xs"
                  icon="i-lucide-edit"
                  class="cursor-pointer"
                >
                  Edit
                </UButton>
              </NuxtLink>
            </template> -->

            <!-- Filename -->
            <!-- <template #filename-cell="{ row }">
              <span v-if="getFirstUpload(row.original)" class="text-xs text-slate-500 font-mono truncate max-w-32 block">
                {{ getFirstUpload(row.original).originalFilename || '—' }}
              </span>
              <span v-else class="text-slate-400">—</span>
            </template> -->
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
    </template>
  </UDashboardPanel>

  <split-panel
    v-if="previewSplitId"
    :split-id="previewSplitId"
    @close="closePreview"
  />
</template>
