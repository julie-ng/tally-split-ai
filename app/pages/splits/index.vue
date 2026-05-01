<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUserStore } from '~/stores/user.store'
import { useSplitsStore } from '~/stores/splits.store'
import { useHouseholdStore } from '~/stores/household.store'

useHead({
  title: 'Splits',
})

const userStore = useUserStore()
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
  // {
  //   accessorKey: 'receiptTotal',
  //   header: 'Receipt Total',
  // },
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
        :user-id="userStore.userId"
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
              <!-- <UBadge
                :color="row.original.isSettled ? 'success' : 'neutral'"
                variant="outline"
              >
                {{ row.original.isSettled ? 'Settled' : 'Unsettled' }}
              </UBadge> -->
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
        </div>
      </ClientOnly>
    </template>
  </UDashboardPanel>
</template>
