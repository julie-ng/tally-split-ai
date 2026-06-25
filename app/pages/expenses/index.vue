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

// Preview slideover: open-state, ?preview URL sync, and esc-to-close.
const {
  previewExpenseId,
  previewExpense,
  isSlideoverOpen,
  openPreview,
} = useExpensePreview()
</script>

<template>
  <UDashboardPanel>
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
          <expense-button-modal @created="refreshAll" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div>
        <h1 class="font-bold text-2xl">
          All Expenses
        </h1>

        <expenses-summary-cards :summary="summary" class="my-4" />

        <expenses-toolbar
          :settled-label="settledLabel"
          :settled-menu-items="settledMenuItems"
          :paid-by-label="paidByLabel"
          :paid-by-menu-items="paidByMenuItems"
          :sort-label="sortLabel"
          :sort-icon="sortIcon"
          :sort-menu-items="sortMenuItems"
          :has-active-filters="hasActiveFilters"
          :pagination-info="paginationInfo"
          class="mt-6 mb-3"
          @reset="reset"
        />

        <ExpensesTable
          v-model:pagination="pagination"
          :data="filteredExpenses"
          :sorting="sorting"
          :pagination-info="paginationInfo"
          :preview-expense-id="previewExpenseId"
          @select="openPreview"
        />
      </div>
    </template>
  </UDashboardPanel>

  <ExpensePreviewSlideover
    v-model:open="isSlideoverOpen"
    :expense="previewExpense"
    :expense-id="previewExpenseId"
  />
</template>
