<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useExpensesTableControls } from '~/composables/useExpensesTableControls'

const route = useRoute()
const year = computed(() => parseInt(route.params.year))
const month = computed(() => parseInt(route.params.month))

if (!year.value || !month.value || month.value < 1 || month.value > 12) {
  throw createError({
    statusCode: 400,
    message: 'Invalid year or month',
  })
}

const monthName = computed(() => dateUtils.getMonthName(month.value))

useHead({
  title: () => `Expenses - ${monthName.value} ${year.value}`,
})

const expensesStore = useExpensesStore()

await callOnce(() => Promise.all([
  expensesStore.fetchAllExpenses(),
  expensesStore.fetchSummary({
    year: year.value,
    month: month.value,
  }),
]), { mode: 'navigation' })

// Refetch summary when navigating between months
watch([year, month], () => {
  expensesStore.fetchSummary({
    year: year.value,
    month: month.value,
  })
})

const { summary } = storeToRefs(expensesStore)
const expenses = computed(() => expensesStore.getExpensesByMonth(year.value, month.value))

const {
  filteredExpenses,
  sorting,
  pagination,
  paginationInfo,
  settledLabel,
  settledMenuItems,
  paidByLabel,
  paidByMenuItems,
  sortLabel,
  sortIcon,
  sortMenuItems,
  hasActiveFilters,
  reset,
} = useExpensesTableControls(expenses)

// Preview panel: open-state, ?preview URL sync, esc-to-close, active tab, and
// warm-on-id-change all live in the composable. Row click sets ?preview; the
// panel's X (bound to isPreviewOpen) clears it.
const {
  previewExpenseId,
  previewExpense,
  isPreviewOpen,
  activeTab,
  openPreview,
} = useExpensePreview()

const hasExpenses = computed(() => expenses.value.length > 0)

async function refreshAll () {
  await Promise.all([
    expensesStore.fetchAllExpenses(),
    expensesStore.fetchSummary({
      year: year.value,
      month: month.value,
    }),
  ])
}

// Batch settle/delete: composable owns row-selection + the handlers. After a
// mutation, refresh this month's summary cards.
const {
  rowSelection,
  selectedCount,
  batchSettle,
  batchDelete,
} = useExpenseBatchActions({
  onMutated: () => expensesStore.fetchSummary({ year: year.value, month: month.value }),
})
</script>

<template>
  <!-- min-w-0 so this wrapper (a flex item inside UDashboardGroup) can shrink to
       its share of the row instead of overflowing; overflow-hidden clips the
       resizable preview to the available width. -->
  <div class="flex flex-1 min-w-0 overflow-hidden">
    <!-- Main table panel: NOT resizable → flex-1, fills the space the preview
         leaves and expands to full width when the preview is closed. min-w-0 so
         the wide table can shrink instead of forcing the row past the viewport
         and pushing the preview off-screen. -->
    <UDashboardPanel id="expenses-month" class="min-w-0">
      <template #header>
        <UDashboardNavbar :title="`${monthName} ${year}`">
          <template #left>
            <UBreadcrumb
              :items="[
                { label: 'Expenses', to: '/expenses' },
                { label: `${monthName} ${year}` },
              ]"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="flex items-center justify-between">
          <h1 class="font-bold text-2xl">
            {{ monthName }} {{ year }}
          </h1>
          <expenses-nav-by-month :label="`${monthName} ${year}`" />
        </div>
        <div v-if="hasExpenses">
          <expenses-summary-cards :summary="summary" class="mb-4" />

          <ExpensesToolbar
            :settled-label="settledLabel"
            :settled-menu-items="settledMenuItems"
            :paid-by-label="paidByLabel"
            :paid-by-menu-items="paidByMenuItems"
            :sort-label="sortLabel"
            :sort-icon="sortIcon"
            :sort-menu-items="sortMenuItems"
            :has-active-filters="hasActiveFilters"
            :pagination-info="paginationInfo"
            :selected-count="selectedCount"
            class="mt-6 mb-3"
            @reset="reset"
            @refresh="refreshAll"
            @batch-settle="batchSettle"
            @batch-delete="batchDelete"
          />

          <ExpensesTable
            v-model:pagination="pagination"
            v-model:row-selection="rowSelection"
            :data="filteredExpenses"
            :sorting="sorting"
            :pagination-info="paginationInfo"
            :preview-expense-id="previewExpenseId"
            :show-pagination="false"
            @select="openPreview"
          />
        </div>
        <div v-else class="-mt-2 mb-6">
          <p class="text-sm mb-4">
            No expenses found for {{ monthName }} {{ year }}. Please upload receipts for analysis.
          </p>
          <upload-button-modal label="Upload Receipts" />
        </div>
      </template>
    </UDashboardPanel>

    <ExpensePreviewPanel
      v-model:open="isPreviewOpen"
      v-model:active-tab="activeTab"
      :expense="previewExpense"
      :expense-id="previewExpenseId"
    />
  </div>
</template>
