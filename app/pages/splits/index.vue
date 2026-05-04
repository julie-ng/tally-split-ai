<script setup>
import { useSplitsStore } from '~/stores/splits.store'
import { useSplitsTableControls } from '~/composables/useSplitsTableControls'

useHead({
  title: 'Splits',
})

const splitsStore = useSplitsStore()

// Fetch splits + summary on mount
await callOnce(() => Promise.all([
  splitsStore.fetchAllSplits(),
  splitsStore.fetchSummary(),
]), { mode: 'navigation' })

const { allSplits: splits, summary } = storeToRefs(splitsStore)

async function refreshAll () {
  await Promise.all([
    splitsStore.fetchAllSplits(),
    splitsStore.fetchSummary(),
  ])
}

// Table view-state: filters + sort
const {
  filteredSplits,
  sorting,
  settledLabel,
  settledMenuItems,
  paidByLabel,
  paidByMenuItems,
  sortLabel,
  sortMenuItems,
  hasActiveFilters,
  reset,
} = useSplitsTableControls(splits)

// -------- Preview panel --------
// URL state: ?preview=<splitId> is the single source of truth.
const route = useRoute()
const router = useRouter()

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
      <splits-summary-cards :summary="summary" />

      <splits-toolbar
        :settled-label="settledLabel"
        :settled-menu-items="settledMenuItems"
        :paid-by-label="paidByLabel"
        :paid-by-menu-items="paidByMenuItems"
        :sort-label="sortLabel"
        :sort-menu-items="sortMenuItems"
        :has-active-filters="hasActiveFilters"
        @reset="reset"
      />

      <splits-table
        :data="filteredSplits"
        :sorting="sorting"
        :preview-split-id="previewSplitId"
        @select="openPreview"
      />
    </template>
  </UDashboardPanel>

  <split-panel
    v-if="previewSplitId"
    :split-id="previewSplitId"
    @close="closePreview"
  />
</template>
