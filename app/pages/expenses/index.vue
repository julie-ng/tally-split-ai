<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useExpensesTableControls } from '~/composables/useExpensesTableControls'

useHead({
  title: 'Expenses',
})

const expensesStore = useExpensesStore()

// Fetch expenses + summary on mount
await callOnce(() => Promise.all([
  expensesStore.fetchAllExpenses(),
  expensesStore.fetchSummary(),
]), { mode: 'navigation' })

const {
  allExpenses: expenses,
  summary,
} = storeToRefs(expensesStore)

async function refreshAll () {
  await Promise.all([
    expensesStore.fetchAllExpenses(),
    expensesStore.fetchSummary(),
  ])
}

// Table view-state: filters + sort
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
// warm-on-id (expense + receipt) all live in the composable.
const {
  previewExpenseId,
  previewExpense,
  isPreviewOpen,
  activeTab,
  openPreview,
} = useExpensePreview()

// Batch settle/delete: composable owns row-selection + the handlers (confirm,
// toasts, optimistic store update). After a mutation, refresh the summary cards.
const {
  rowSelection,
  selectedCount,
  batchSettle,
  batchDelete,
} = useExpenseBatchActions({ onMutated: () => expensesStore.fetchSummary() })
</script>

<template>
  <!-- min-w-0 so this wrapper (a flex item inside UDashboardGroup) can shrink to
       its share of the row instead of overflowing; overflow-hidden clips the
       resizable preview to the available width. -->
  <div class="flex flex-1 min-w-0 overflow-hidden">
    <!-- Main table panel: NOT resizable → flex-1, fills the space the preview
         leaves and expands to full width when the preview closes. min-w-0 so the
         wide table can shrink instead of forcing the row past the viewport. -->
    <UDashboardPanel class="min-w-0">
      <template #header>
        <UDashboardNavbar title="Expenses">
          <template #left>
            <UBreadcrumb
              :items="[
                {
                  label: 'Expenses',
                },
                {
                  label: 'All',
                },
              ]"
            />
          </template>
          <template #right>
            <ExpenseCreateSlideoverButton @created="refreshAll" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div>
          <h1 class="font-bold text-2xl">
            All Expenses
          </h1>

          <expenses-summary-cards :summary="summary" class="my-4" />

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
            @select="openPreview"
          />
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
