<script setup>
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useUserStore } from '~/stores/user.store'
import { useSplitsStore } from '~/stores/splits.store'

useHead({
  title: 'Splits',
})

const userStore = useUserStore()
const splitsStore = useSplitsStore()

// User config for display names
const config = useRuntimeConfig()
const user1Name = config.public.splitUserOneName
const user2Name = config.public.splitUserTwoName

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

const columns = [
  {
    accessorKey: 'analysisStatus',
    header: 'Status',
  },
  {
    accessorKey: 'title',
    header: 'Receipt',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'receiptTotal',
    header: 'Receipt Total',
  },
  {
    accessorKey: 'splitAmount',
    header: 'Split Amount',
  },
  {
    accessorKey: 'userAShare',
    header: `${user1Name}`,
  },
  {
    accessorKey: 'userBShare',
    header: `${user2Name}`,
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
  <UContainer>
    <div class="my-5">
      <!-- Header -->
      <div class="flex justify-between items-center mb-5">
        <div>
          <h1 class="font-bold text-2xl">
            Splits
          </h1>
          <p class="mt-1 text-sm text-slate-400">
            Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} splits for
            {{ userStore.userId }}
          </p>
        </div>
        <UButton class="px-4 py-2 cursor-pointer" @click="refreshAll">
          Refresh
        </UButton>
      </div>

      <!-- Summary Cards -->
      <div v-if="summary" class="grid grid-cols-4 gap-4 mb-5">
        <div class="border rounded-lg p-4 bg-white">
          <div class="text-sm text-slate-500">
            {{ user1Name }}'s Share
          </div>
          <div class="text-2xl font-bold text-slate-800">
            {{ receiptUtils.formatCurrency(summary.userAShare, 'EUR') }}
          </div>
        </div>
        <div class="border rounded-lg p-4 bg-white">
          <div class="text-sm text-slate-500">
            {{ user2Name }}'s Share
          </div>
          <div class="text-2xl font-bold text-slate-800">
            {{ receiptUtils.formatCurrency(summary.userBShare, 'EUR') }}
          </div>
        </div>
        <div class="border rounded-lg p-4 bg-white">
          <div class="text-sm text-slate-500">
            Net Balance
          </div>
          <div class="text-2xl font-bold" :class="summary.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ receiptUtils.formatCurrency(Math.abs(summary.netBalance), 'EUR') }}
            <span class="text-sm font-normal text-slate-500">
              ({{ summary.netBalance >= 0 ? `${user1Name} owes` : `${user2Name} owes` }})
            </span>
          </div>
        </div>
        <div class="border rounded-lg p-4 bg-white">
          <div class="text-sm text-slate-500">
            Unsettled
          </div>
          <div class="text-2xl font-bold text-slate-800">
            {{ summary.unsettledCount }}
            <span v-if="summary.pendingCount > 0" class="text-sm font-normal text-orange-500">
              ({{ summary.pendingCount }} pending)
            </span>
          </div>
        </div>
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
                {{ timestampUtils.toShortDate(row.original.receipt.date) }}
              </time>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Receipt Total -->
            <template #receiptTotal-cell="{ row }">
              <div v-if="row.original.receipt?.total != null" class="text-right font-medium">
                {{ receiptUtils.formatCurrency(row.original.receipt.total, row.original.receipt.currency || 'EUR') }}
              </div>
              <span v-else class="text-slate-400">—</span>
            </template>

            <!-- Editable columns via splits-table-cell component -->
            <template #splitAmount-cell="{ row }">
              <splits-table-cell :split-id="row.original.id" field="splitAmount" />
            </template>

            <template #userAShare-cell="{ row }">
              <splits-table-cell :split-id="row.original.id" field="userAShare" />
            </template>

            <template #userBShare-cell="{ row }">
              <splits-table-cell :split-id="row.original.id" field="userBShare" />
            </template>

            <template #paidBy-cell="{ row }">
              <splits-table-cell :split-id="row.original.id" field="paidBy" />
            </template>

            <template #isSettled-cell="{ row }">
              <splits-table-cell :split-id="row.original.id" field="isSettled" />
            </template>

            <!-- Actions -->
            <template #actions-cell="{ row }">
              <splits-table-cell :split-id="row.original.id" field="actions" />
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
