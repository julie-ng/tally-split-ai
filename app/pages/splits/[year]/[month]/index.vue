<script setup>
import { useSplitsStore } from '~/stores/splits.store'
import { useSplitsTableControls } from '~/composables/useSplitsTableControls'

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
  title: () => `Splits - ${monthName.value} ${year.value}`,
})

const splitsStore = useSplitsStore()

await callOnce(() => Promise.all([
  splitsStore.fetchAllSplits(),
  splitsStore.fetchSummary({
    year: year.value,
    month: month.value,
  }),
]), { mode: 'navigation' })

// Refetch summary when navigating between months
watch([year, month], () => {
  splitsStore.fetchSummary({
    year: year.value,
    month: month.value,
  })
})

const { summary } = storeToRefs(splitsStore)
const splits = computed(() => splitsStore.getSplitsByMonth(year.value, month.value))

const {
  filteredSplits,
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
} = useSplitsTableControls(splits)

// Preview panel — URL state via ?preview=<splitId>
const previewSplitId = computed(() => {
  const raw = route.query.preview
  if (!raw) {
    return null
  }
  const id = Number(raw)
  return Number.isFinite(id)
    ? id
    : null
})

function openPreview (event, row) {
  router.replace({ query: { ...route.query, preview: row.original.id } })
}

function closePreview () {
  const query = { ...route.query }
  delete query.preview
  router.replace({ query })
}

const hasSplits = computed(() => splits.value.length > 0)

const allSettled = computed(() =>
  splits.value.length > 0 && splits.value.every(s => s.isSettled),
)

const settleableCount = computed(() =>
  splits.value.filter(s => !s.isSettled && s.paidByUserId).length,
)

async function refreshAll () {
  await Promise.all([
    splitsStore.fetchAllSplits(),
    splitsStore.fetchSummary({
      year: year.value,
      month: month.value,
    }),
  ])
}

async function handleMarkAllSettled () {
  if (!confirm(`Mark all ${splits.value.length} splits for ${monthName.value} ${year.value} as settled?`)) {
    return
  }

  try {
    await splitsStore.markMonthAsSettled(year.value, month.value)
    await splitsStore.fetchSummary({
      year: year.value,
      month: month.value,
    })
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
        <div class="flex items-center justify-between mb-3">
          <h1 class="font-bold text-2xl">
            {{ monthName }} {{ year }}
          </h1>
          <splits-nav-by-month :label="`${monthName} ${year}`" />
        </div>

        <splits-summary-cards :summary="summary" class="my-4" />

        <splits-toolbar
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

        <splits-table
          v-model:pagination="pagination"
          :data="filteredSplits"
          :sorting="sorting"
          :pagination-info="paginationInfo"
          :preview-split-id="previewSplitId"
          :show-pagination="false"
          max-height="calc(100vh - 400px)"
          @select="openPreview"
        >
          <template #footer>
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
          </template>
        </splits-table>
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

  <split-panel
    v-if="previewSplitId"
    :split-id="previewSplitId"
    @close="closePreview"
  />
</template>
