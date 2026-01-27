<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUserStore } from '~/stores/user.store'
import { useSplitsStore } from '~/stores/splits.store'

// Get route params
const route = useRoute()
const year = parseInt(route.params.year)
const month = parseInt(route.params.month)

// Validate params
if (!year || !month || month < 1 || month > 12) {
  throw createError({
    statusCode: 400,
    message: 'Invalid year or month',
  })
}

// Helper for month name
const monthName = computed(() => {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long' })
})

useHead({
  title: `Splits - ${monthName.value} ${year}`,
})

const userStore = useUserStore()
const splitsStore = useSplitsStore()

// User config for display names
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName
const user1Id = config.public.splitUserOneId
const user2Id = config.public.splitUserTwoId

// Fetch filtered splits on mount
await callOnce(() => splitsStore.fetchAllSplits({ year, month }), { mode: 'navigation' })

// Get reactive refs from store
const { allSplits: splits, loading } = storeToRefs(splitsStore)
const pending = computed(() => loading.value.all || false)

// Fetch filtered summary data
const { data: summary, refresh: refreshSummary } = await useFetch('/api/splits/summary', {
  query: { year, month },
})

// Table setup
const table = useTemplateRef('table')
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

const columns = [
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
    accessorKey: 'userAShare',
    header: `${user1Name}'s' Share`,
  },
  {
    accessorKey: 'userBShare',
    header: `${user2Name}'s Share`,
  },
  {
    accessorKey: 'paidBy',
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
]

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

/**
 * Get user name by ID
 */
function getUserName (userId) {
  if (userId === user1Id) return user1Name
  if (userId === user2Id) return user2Name
  return '?'
}

function netBalanceText (summary) {
  return summary.netBalance >= 0
    ? `${user1Name} owes`
    : `${user2Name} owes`
}

/**
 * Refresh both splits and summary
 */
async function refreshAll () {
  await Promise.all([
    splitsStore.fetchAllSplits({ year, month }),
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
  <UContainer>
    <div class="my-5">
      <!-- Breadcrumb -->
      <div class="mb-3">
        <NuxtLink to="/splits" class="text-sm text-blue-600 hover:underline">
          ← All Splits
        </NuxtLink>
      </div>

      <!-- Header -->
      <splits-monthly-header
        :title="`${monthName} ${year}`"
        :period="`${monthName} ${year}`"
        :pagination-info="paginationInfo"
        :user-id="userStore.userId"
        @refresh="refreshAll"
      />

      <!-- Summary Cards -->
      <div v-if="summary" class="grid grid-cols-4 gap-4 mb-5">
        <split-card
          :title="`${receiptUtils.formatCurrency(summary.userAShare, 'EUR')}`"
          :subtitle="`${user1Name}'s Share`"
        />
        <split-card
          :title="`${receiptUtils.formatCurrency(summary.userBShare, 'EUR')}`"
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
        <div class="border bg-white border-slate-200 rounded-lg overflow-hidden">
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

            <!-- User A Share (Read-Only) -->
            <template #userAShare-cell="{ row }">
              <div v-if="row.original.userAShare != null" class="text-right font-medium">
                {{ receiptUtils.formatCurrency(row.original.userAShare, 'EUR') }}
              </div>
              <div v-else class="text-slate-400 text-right">
                -
              </div>
            </template>

            <!-- User B Share (Read-Only) -->
            <template #userBShare-cell="{ row }">
              <div v-if="row.original.userBShare != null" class="text-right font-medium">
                {{ receiptUtils.formatCurrency(row.original.userBShare, 'EUR') }}
              </div>
              <div v-else class="text-slate-400 text-right">
                -
              </div>
            </template>

            <!-- Paid By (Read-Only) -->
            <template #paidBy-cell="{ row }">
              <div class="text-sm">
                {{ getUserName(row.original.paidBy) }}
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
        </div>
      </ClientOnly>
    </div>
  </UContainer>
</template>
