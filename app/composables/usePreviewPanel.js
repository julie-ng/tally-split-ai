/**
 * Generic driver for a `?preview=<id>`-synced side/tab preview panel — the
 * shared plumbing behind the expenses and uploads list-detail panels. Owns the
 * URL sync, open-state, active tab, esc-to-close, and the warm-on-id watch. The
 * caller supplies WHAT to warm (its own stores) and the default tab; it keeps
 * its own resource getters.
 *
 * `?preview=<id>` is the single source of truth for *which* row is previewed.
 * Open-state is seeded ONCE from the URL (so a cold-load `?preview=<id>`
 * auto-opens) then owned locally — NOT a computed off the id, which would
 * re-trigger on every row swap. Call from PAGE setup (the page owns the router;
 * this packages the canonical ?preview behavior). Panel tabs are NEVER in the
 * URL — `activeTab` is a plain ref, reset to `defaultTab` on id-change.
 *
 * @param {object} [options]
 * @param {string} [options.defaultTab='overview'] - tab selected on open + reset
 *   to on every id-change.
 * @param {(id: string) => (void | Promise<void>)} [options.warm] - caller's
 *   warm callback, run on id-change (and immediately on cold-load). Warm the
 *   caller's stores here. If it throws, the preview auto-closes (a stale/deleted
 *   ?preview id shouldn't leave a broken open panel).
 * @returns {{
 *   previewId: import('vue').ComputedRef<string|null>,
 *   isPreviewOpen: import('vue').Ref<boolean>,
 *   activeTab: import('vue').Ref<string>,
 *   openPreview: (event: Event, row: { original: { id: string } }) => void,
 *   closePreview: () => void,
 * }}
 */
export function usePreviewPanel (options = {}) {
  const { defaultTab = 'overview', warm } = options

  const route = useRoute()
  const router = useRouter()

  const previewId = computed(() => route.query.preview ?? null)

  // Seeded once from the URL (cold-load auto-open), then owned locally.
  const isPreviewOpen = ref(!!previewId.value)

  // Panel presentation only — never in the URL. Reset on id-change (below) so
  // switching rows while open always lands on the default tab.
  const activeTab = ref(defaultTab)

  // Reset the tab + run the caller's warm whenever the selected id changes.
  // immediate: on a cold hard-load the URL already carries ?preview=<id>, so
  // previewId is born set and never "changes" — without immediate the warm
  // never runs. Matches the immediate id-watches in the tab leaves.
  watch(previewId, async (id) => {
    if (!id) {
      return
    }
    activeTab.value = defaultTab
    if (!warm) {
      return
    }
    try {
      await warm(id)
    }
    catch (err) {
      // The ?preview id points at something that no longer exists (deleted, or
      // a stale/hand-edited URL). Close instead of leaving a broken panel.
      console.warn(`[usePreviewPanel] warm failed for ${id}, closing preview:`, err)
      isPreviewOpen.value = false
    }
  }, { immediate: true })

  function openPreview (event, row) {
    isPreviewOpen.value = true
    router.replace({ query: { ...route.query, preview: row.original.id } })
  }

  function closePreview () {
    const query = { ...route.query }
    delete query.preview
    router.replace({ query })
  }

  // Closing the open-state clears the URL param (X button, esc).
  watch(isPreviewOpen, (value) => {
    if (!value) {
      closePreview()
    }
  })

  // Esc-to-close (panels have no built-in dismiss handler).
  function onKeydown (event) {
    if (event.key === 'Escape' && isPreviewOpen.value) {
      isPreviewOpen.value = false
    }
  }
  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
  })

  return {
    previewId,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
  }
}
