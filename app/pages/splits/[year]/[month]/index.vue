<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useSplitsStore } from '~/stores/splits.store'
import { useHouseholdStore } from '~/stores/household.store'

// Get route params reactively so navigation between months works
const route = useRoute()
const year = computed(() => parseInt(route.params.year))
const month = computed(() => parseInt(route.params.month))

// Validate params
if (!year.value || !month.value || month.value < 1 || month.value > 12) {
  throw createError({
    statusCode: 400,
    message: 'Invalid year or month',
  })
}

const monthName = computed(() => dateUtils.getMonthName(month.value))

useHead({
  title: `Splits - ${monthName.value} ${year.value}`,
})

const splitsStore = useSplitsStore()
const householdStore = useHouseholdStore()

const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

// Fetch all splits (no filter) so the store has full dataset for client-side filtering
await callOnce(() => splitsStore.fetchAllSplits(), { mode: 'navigation' })

// Get splits filtered by month (reactive to year/month changes)
const splits = computed(() => splitsStore.getSplitsByMonth(year.value, month.value))
const { loading } = storeToRefs(splitsStore)
const pending = computed(() => loading.value.all || false)

// Fetch filtered summary data
const { data: summary, refresh: refreshSummary } = await useFetch('/api/splits/summary', {
  query: { year, month },
})

// Refetch summary when navigating between months
watch([year, month], () => refreshSummary())

// Table setup
const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

const columns = computed(() => [
  {
    accessorKey: 'analysisStatus',
    header: 'Analyzed',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'title',
    header: 'Receipt',
  },
  {
    accessorKey: 'splitAmount',
    header: 'Split Amount',
  },
  {
    accessorKey: 'userOneShare',
    header: `${user1Name.value}'s Share`,
  },
  {
    accessorKey: 'userTwoShare',
    header: `${user2Name.value}'s Share`,
  },
  {
    accessorKey: 'paidByUserId',
    header: 'Paid By',
  },
  {
    accessorKey: 'isSettled',
    header: 'Settled',
  },
  {
    id: 'actions',
    header: 'Actions',
  },
  {
    accessorKey: 'filename',
    header: 'File',
  },
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

/**
 * Check if all splits in this month are already settled
 */
const allSettled = computed(() =>
  splits.value.length > 0 && splits.value.every(s => s.isSettled),
)

/**
 * Number of unsettled splits eligible to settle (have a known payer).
 * Splits without paidByUserId are skipped by the batch endpoint.
 */
const settleableCount = computed(() =>
  splits.value.filter(s => !s.isSettled && s.paidByUserId).length,
)

const hasSplits = computed(() => splits.value.length > 0)

/**
 * Handle marking all splits for the month as settled
 */
async function handleMarkAllSettled () {
  if (!confirm(`Mark all ${splits.value.length} splits for ${monthName.value} ${year.value} as settled?`)) {
    return
  }

  try {
    await splitsStore.markMonthAsSettled(year.value, month.value)
    // Refresh summary to update counts
    await refreshSummary()
  }
  catch (err) {
    console.error(err)
    alert('Failed to mark splits as settled. Please try again.')
    throw createError(err)
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="`${monthName} ${year}`">
        <template #left>
          <UBreadcrumb
            :items="[
              { label: 'Splits', to: '/splits' },
              { label: `${monthName} ${year}` },
            ]"
          />
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
      <div v-if="hasSplits">
        <!-- Header -->
        <splits-monthly-header
          :title="`${monthName} ${year}`"
          :period="`${monthName} ${year}`"
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

        <!-- Table -->
        <ClientOnly>
          <div class="border bg-white border-slate-200 rounded-lg">
            <UTable
              ref="table"
              v-model:pagination="pagination"
              :pagination-options="{
                getPaginationRowModel: getPaginationRowModel(),
                autoResetPageIndex: false,
              }"
              :data="splits"
              :columns="columns"
              :ui="tableStyles"
              :loading="pending"
              loading-color="primary"
              loading-animation="carousel"
              class="flex-1"
            >
              <!-- Analysis Status -->
              <template #analysisStatus-cell="{ row }">
                <UBadge
                  v-if="getFirstUpload(row.original)"
                  :color="badgeStyleHelpers.statusBadgeColor(getFirstUpload(row.original).analysisStatus)"
                  :variant="badgeStyleHelpers.statusBadgeVariant(getFirstUpload(row.original).analysisStatus)"
                >
                  {{ getFirstUpload(row.original).analysisStatus || 'unknown' }}
                </UBadge>
                <span v-else class="text-slate-400">—</span>
              </template>

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
              </template>

              <!-- Actions -->
              <template #actions-cell="{ row }">
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
              </template>

              <!-- Filename -->
              <template #filename-cell="{ row }">
                <span v-if="getFirstUpload(row.original)" class="text-xs text-slate-500 font-mono truncate max-w-32 block">
                  {{ getFirstUpload(row.original).originalFilename || '—' }}
                </span>
                <span v-else class="text-slate-400">—</span>
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

            <!-- Mark All as Settled -->
            <div class="px-4 py-3 border-t border-default">
              <UButton
                color="primary"
                variant="solid"
                icon="i-lucide-check-check"
                :disabled="splits.length === 0 || allSettled || settleableCount === 0"
                @click="handleMarkAllSettled"
              >
                Mark All as Settled
              </UButton>
            </div>
          </div>
        </ClientOnly>
      </div>
      <div v-else class="my-6">
        <h1 class="mb-1 font-bold text-xl">
          No splits for {{ monthName }} {{ year }}
        </h1>
        <p class="mb-4">
          Please upload receipts to get some data.
        </p>
        <upload-button-modal label="Upload Receipts" />
      </div>
    </template>
  </UDashboardPanel>
</template>
