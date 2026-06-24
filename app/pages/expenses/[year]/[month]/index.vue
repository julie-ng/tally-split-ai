<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useExpensesTableControls } from '~/composables/useExpensesTableControls'

const route = useRoute()
const router = useRouter()
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

// Preview panel — URL state via ?preview=<expenseId>
const previewExpenseId = computed(() => route.query.preview ?? null)

function openPreview (event, row) {
  router.replace({ query: { ...route.query, preview: row.original.id } })
}

function closePreview () {
  const query = { ...route.query }
  delete query.preview
  router.replace({ query })
}

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

</script>

<template>
  <UDashboardPanel>
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
          @refresh="refreshAll"
        />

        <expenses-table
          v-model:pagination="pagination"
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

  <expense-panel
    :expense-id="previewExpenseId"
    @close="closePreview"
  />
</template>
