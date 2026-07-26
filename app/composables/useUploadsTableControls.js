import { useWorkflowStore } from '~/stores/workflow.store'

/**
 * View-state composable for the uploads list page: status filter + sort
 * dropdown and the derived `filteredUploads` + `sorting` they produce.
 *
 * Owned by the page, NOT the uploads store — ephemeral UI state, not domain
 * data. Mirrors useExpensesTableControls so both pages share the toolbar shape.
 *
 * The status filter keys off the workflow store's `hasErrorsById` (errored vs
 * not), so this composable reads that store directly (like the expenses one
 * reads the household store).
 *
 * @param {import('vue').Ref<Array>} uploadsRef - reactive array of merged uploads
 * @returns {Object} state, derived data, and dropdown menu items
 */
export function useUploadsTableControls (uploadsRef) {
  const workflowStore = useWorkflowStore()

  // -------- Status filter --------
  const STATUS_OPTIONS = [
    { value: 'all', label: 'All uploads' },
    { value: 'completed', label: 'Completed' },
    { value: 'errored', label: 'Has errors' },
  ]
  const statusFilter = ref('all')

  const statusLabel = computed(() => {
    const option = STATUS_OPTIONS.find(o => o.value === statusFilter.value)
    return option?.label ?? 'All uploads'
  })

  const statusMenuItems = computed(() => [
    [
      { label: 'Status', type: 'label' },
      ...STATUS_OPTIONS.map(o => ({
        label: o.label,
        slot: 'check',
        active: statusFilter.value === o.value,
        onSelect: () => {
          statusFilter.value = o.value
        },
      })),
    ],
  ])

  const filteredUploads = computed(() => {
    if (statusFilter.value === 'all') {
      return uploadsRef.value
    }
    if (statusFilter.value === 'errored') {
      return uploadsRef.value.filter(u => workflowStore.hasErrorsById(u.id))
    }
    // 'completed' — no errors
    return uploadsRef.value.filter(u => !workflowStore.hasErrorsById(u.id))
  })

  // -------- Sort dropdown --------
  // `value` MUST match the table's column id/accessorKey so TanStack sorts the
  // right column. Add new entries to extend the dropdown.
  const sortOptions = [
    { value: 'uploadedAt', label: 'Uploaded' },
    { value: 'receiptDate', label: 'Receipt Date' },
    { value: 'size', label: 'File Size' },
  ]
  const sortBy = ref('uploadedAt')
  const sortOrder = ref('desc') // 'desc' | 'asc'

  const sorting = computed(() => [{
    id: sortBy.value,
    desc: sortOrder.value === 'desc',
  }])

  const sortLabel = computed(() => {
    const option = sortOptions.find(o => o.value === sortBy.value)
    return option?.label ?? 'Sort'
  })

  const sortIcon = computed(() => sortOrder.value === 'desc'
    ? 'i-lucide-arrow-down-wide-narrow'
    : 'i-lucide-arrow-up-narrow-wide',
  )

  const sortMenuItems = computed(() => [
    [
      { label: 'Sort by', type: 'label' },
      ...sortOptions.map(o => ({
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
    pageSize: 50,
  })

  const paginationInfo = computed(() => {
    const total = filteredUploads.value.length
    if (total === 0) {
      return { start: 0, end: 0, total: 0 }
    }
    const { pageIndex, pageSize } = pagination.value
    const start = pageIndex * pageSize + 1
    const end = Math.min((pageIndex + 1) * pageSize, total)
    return { start, end, total }
  })

  // Clamp pageIndex when filtered data shrinks below the current page (e.g. after
  // a batch delete or filter change).
  watch(
    () => filteredUploads.value.length,
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
    statusFilter: 'all',
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
  }

  const hasActiveFilters = computed(() =>
    statusFilter.value !== DEFAULTS.statusFilter
    || sortBy.value !== DEFAULTS.sortBy
    || sortOrder.value !== DEFAULTS.sortOrder,
  )

  function reset () {
    statusFilter.value = DEFAULTS.statusFilter
    sortBy.value = DEFAULTS.sortBy
    sortOrder.value = DEFAULTS.sortOrder
  }

  return {
    // Derived data for the table
    filteredUploads,
    sorting,
    pagination,
    paginationInfo,
    // Dropdown UI state
    statusLabel,
    statusMenuItems,
    sortLabel,
    sortIcon,
    sortMenuItems,
    // Reset
    hasActiveFilters,
    reset,
  }
}
