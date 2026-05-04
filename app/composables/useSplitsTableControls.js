import { useHouseholdStore } from '~/stores/household.store'

/**
 * View-state composable for the splits list page: filter + sort dropdowns
 * and the derived `filteredSplits` + `sorting` they produce.
 *
 * Owned by the page (or a page-level component), NOT the splits store —
 * this is ephemeral UI state, not domain data.
 *
 * @param {import('vue').Ref<Array>} splitsRef - reactive array of splits
 * @returns {Object} state, derived data, and dropdown menu items
 */
export function useSplitsTableControls (splitsRef) {
  const householdStore = useHouseholdStore()
  const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
  const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

  // -------- Settled filter --------
  const SETTLED_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'settled', label: 'Is Settled' },
    { value: 'unsettled', label: 'Not Settled' },
  ]
  const settledFilter = ref('all')

  const settledLabel = computed(() => {
    const option = SETTLED_OPTIONS.find(o => o.value === settledFilter.value)
    return option?.label ?? 'All'
  })

  const settledMenuItems = computed(() => [
    [
      { label: 'Settled', type: 'label' },
      ...SETTLED_OPTIONS.map(o => ({
        label: o.label,
        slot: 'check',
        active: settledFilter.value === o.value,
        onSelect: () => {
          settledFilter.value = o.value
        },
      })),
    ],
  ])

  // -------- Paid By filter --------
  const paidByOptions = computed(() => [
    { value: 'all', label: 'All' },
    { value: householdStore.userOne?.id, label: user1Name.value },
    { value: householdStore.userTwo?.id, label: user2Name.value },
    { value: 'unknown', label: 'Unknown' },
  ])
  const paidByFilter = ref('all')

  const paidByLabel = computed(() => {
    const option = paidByOptions.value.find(o => o.value === paidByFilter.value)
    return option?.label ?? 'All'
  })

  const paidByMenuItems = computed(() => [
    [
      { label: 'Paid By', type: 'label' },
      ...paidByOptions.value.map(o => ({
        label: o.label,
        slot: 'check',
        active: paidByFilter.value === o.value,
        onSelect: () => {
          paidByFilter.value = o.value
        },
      })),
    ],
  ])

  const filteredSplits = computed(() => {
    let result = splitsRef.value

    if (settledFilter.value === 'settled') {
      result = result.filter(s => s.isSettled)
    }
    else if (settledFilter.value === 'unsettled') {
      result = result.filter(s => !s.isSettled)
    }

    if (paidByFilter.value === 'unknown') {
      result = result.filter(s => !s.paidByUserId)
    }
    else if (paidByFilter.value !== 'all') {
      result = result.filter(s => s.paidByUserId === paidByFilter.value)
    }

    return result
  })

  // -------- Sort dropdown --------
  // Add new entries to extend the dropdown.
  const sortOptions = computed(() => [
    { value: 'date', label: 'Receipt Date' },
    { value: 'splitAmount', label: 'Split Amount' },
    { value: 'userOneShare', label: `${user1Name.value}'s Share` },
    { value: 'userTwoShare', label: `${user2Name.value}'s Share` },
  ])
  const sortBy = ref('date')
  const sortOrder = ref('desc') // 'desc' | 'asc'

  const sorting = computed(() => [{
    id: sortBy.value,
    desc: sortOrder.value === 'desc',
  }])

  const sortLabel = computed(() => {
    const option = sortOptions.value.find(o => o.value === sortBy.value)
    return option?.label ?? 'Sort'
  })

  const sortIcon = computed(() => sortOrder.value === 'desc'
    ? 'i-lucide-arrow-down-wide-narrow'
    : 'i-lucide-arrow-up-narrow-wide',
  )

  const sortMenuItems = computed(() => [
    [
      { label: 'Sort by', type: 'label' },
      ...sortOptions.value.map(o => ({
        label: o.label,
        slot: 'check',
        active: sortBy.value === o.value,
        onSelect: () => {
          sortBy.value = o.value
        },
      })),
    ],
    [
      { label: 'Order', type: 'label' },
      {
        label: 'ASC',
        slot: 'check',
        active: sortOrder.value === 'asc',
        onSelect: () => {
          sortOrder.value = 'asc'
        },
      },
      {
        label: 'DESC',
        slot: 'check',
        active: sortOrder.value === 'desc',
        onSelect: () => {
          sortOrder.value = 'desc'
        },
      },
    ],
  ])

  // -------- Pagination --------
  const pagination = ref({
    pageIndex: 0,
    pageSize: 25,
  })

  const paginationInfo = computed(() => {
    const total = filteredSplits.value.length
    const { pageIndex, pageSize } = pagination.value
    if (total === 0) {
      return { start: 0, end: 0, total: 0 }
    }
    const start = pageIndex * pageSize + 1
    const end = Math.min((pageIndex + 1) * pageSize, total)
    return { start, end, total }
  })

  // Clamp pageIndex when filtered data shrinks below the current page.
  watch(
    () => filteredSplits.value.length,
    (total) => {
      const { pageIndex, pageSize } = pagination.value
      const lastValidPage = Math.max(0, Math.ceil(total / pageSize) - 1)
      if (pageIndex > lastValidPage) {
        pagination.value.pageIndex = lastValidPage
      }
    },
  )

  // Defaults — single source of truth for resetting.
  const DEFAULTS = {
    settledFilter: 'all',
    paidByFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
  }

  const hasActiveFilters = computed(() =>
    settledFilter.value !== DEFAULTS.settledFilter
    || paidByFilter.value !== DEFAULTS.paidByFilter
    || sortBy.value !== DEFAULTS.sortBy
    || sortOrder.value !== DEFAULTS.sortOrder,
  )

  function reset () {
    settledFilter.value = DEFAULTS.settledFilter
    paidByFilter.value = DEFAULTS.paidByFilter
    sortBy.value = DEFAULTS.sortBy
    sortOrder.value = DEFAULTS.sortOrder
  }

  return {
    // Derived data for the table
    filteredSplits,
    sorting,
    pagination,
    paginationInfo,
    // Dropdown UI state
    settledLabel,
    settledMenuItems,
    paidByLabel,
    paidByMenuItems,
    sortLabel,
    sortIcon,
    sortMenuItems,
    // Reset
    hasActiveFilters,
    reset,
  }
}
