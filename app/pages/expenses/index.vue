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

// -------- Preview panel --------
// URL state: ?preview=<expenseId> is the single source of truth.
const route = useRoute()
const router = useRouter()

const previewExpenseId = computed(() => route.query.preview ?? null)

// The slideover lives here (page level), not inside <ExpensesTable>: the page
// owns the ?preview selection, so it owns the slideover that renders it. Keeps
// the table a pure rows+clicks component with no preview knowledge.
//
// Open-state is decoupled from previewExpenseId — seeded once (so a cold-load
// ?preview=<id> auto-opens), then owned locally. `:dismissible="false"` on the
// slideover is what fixed the blink: with modal/overlay off, a row click counted
// as click-outside → dismiss → open flipped true→false→true → panel repainted.
const isSlideoverOpen = ref(!!previewExpenseId.value)

const previewExpense = computed(() => previewExpenseId.value
  ? expensesStore.getExpenseById(previewExpenseId.value)
  : null,
)

function openPreview (event, row) {
  isSlideoverOpen.value = true
  router.replace({ query: { ...route.query, preview: row.original.id } })
}

function closePreview () {
  const query = { ...route.query }
  delete query.preview
  router.replace({ query })
}

watch(isSlideoverOpen, (value) => {
  if (!value) {
    closePreview()
  }
})

// `:dismissible="false"` also disables esc-to-close, so restore it manually.
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

function onKeydown (event) {
  if (event.key === 'Escape' && isSlideoverOpen.value) {
    isSlideoverOpen.value = false
  }
}
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

  <USlideover
    v-model:open="isSlideoverOpen"
    :title="previewExpense?.title"
    :description="previewExpense?.receipt?.merchantName"
    :modal="false"
    :overlay="false"
    :dismissible="false"
    :transition="false"
    :unmount-on-hide="false"
    :ui="{
      content: 'top-(--ui-header-height) h-[calc(100%-var(--ui-header-height))] max-w-3xl ring-1 ring-default',
    }"
  >
    <template #body>
      <div class="pt-2 px-4">
        <ExpensePreview v-if="previewExpenseId" :expense-id="previewExpenseId" />
      </div>
    </template>
  </USlideover>
</template>
