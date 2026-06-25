import { useExpensesStore } from '~/stores/expenses.store'

/**
 * Drives the expense preview slideover for a list page.
 *
 * The `?preview=<expenseId>` query param is the single source of truth for
 * *which* expense is previewed; this composable owns that URL sync plus the
 * slideover's open-state. Open-state is deliberately decoupled from the id
 * (seeded once so a cold-load `?preview=<id>` auto-opens, then owned locally) —
 * see app/components/expense/Preview.vue and the blink history: with a non-modal
 * slideover, re-deriving `open` from the id re-triggered repaints.
 *
 * Call from page setup (the page owns the router; this packages the canonical
 * ?preview behavior so every list page doesn't re-implement it).
 *
 * @returns {{
 *   previewExpenseId: import('vue').ComputedRef<string|null>,
 *   previewExpense: import('vue').ComputedRef<object|null>,
 *   isSlideoverOpen: import('vue').Ref<boolean>,
 *   openPreview: (event: Event, row: { original: { id: string } }) => void,
 *   closePreview: () => void,
 * }}
 */
export function useExpensePreview () {
  const route = useRoute()
  const router = useRouter()
  const expensesStore = useExpensesStore()

  const previewExpenseId = computed(() => route.query.preview ?? null)

  const previewExpense = computed(() => previewExpenseId.value
    ? expensesStore.getExpenseById(previewExpenseId.value)
    : null,
  )

  // Seeded once from the URL (cold-load auto-open), then owned locally. NOT a
  // computed off previewExpenseId — that re-coupling is what caused the blink.
  const isSlideoverOpen = ref(!!previewExpenseId.value)

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

  // `:dismissible="false"` (set on the slideover to fix the blink) also disables
  // esc-to-close, so restore it here.
  function onKeydown (event) {
    if (event.key === 'Escape' && isSlideoverOpen.value) {
      isSlideoverOpen.value = false
    }
  }
  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
  })

  return {
    previewExpenseId,
    previewExpense,
    isSlideoverOpen,
    openPreview,
    closePreview,
  }
}
