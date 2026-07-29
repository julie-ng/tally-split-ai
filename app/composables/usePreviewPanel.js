/**
 * Generic driver for a `?preview=<id>&tab=<tab>`-synced side/tab preview panel —
 * the shared plumbing behind the expenses and uploads list-detail panels. Owns
 * the URL sync (resource + tab), open-state, esc-to-close, and the load-on-id
 * watch. The caller supplies WHAT to load (its own stores), the default tab, and
 * the valid tab values; it keeps its own resource getters.
 *
 * Deliberately RESOURCE-AGNOSTIC: the selected id is exposed as `resourceId`
 * (the subject the panel is about — an upload, an expense, whatever), NOT
 * `previewId`. "Preview" is a presentation MODE that may change (panel today, a
 * page later); the id names the resource, not the mode. Call sites alias it to
 * their domain — `const { resourceId: uploadId } = usePreviewPanel(...)` — so the
 * PAGE reads domain-true while the COMPOSABLE stays role-true.
 *
 * URL model:
 * - `?preview=<id>` is the single source of truth for WHICH resource. Open-state
 *   is seeded ONCE from it (cold-load auto-open) then owned locally — NOT a
 *   computed off the id, which would re-trigger on every row swap.
 * - `?tab=<tab>` is the source of truth for WHICH facet. Addressable +
 *   refresh-stable + deep-linkable. A tab-only change leaves `resourceId`
 *   value-identical, so the load watch does NOT re-fire. Unknown/missing `tab`
 *   falls back to `defaultTab`. Uses router.replace (no history spam) for both.
 *
 * Call from PAGE setup (the page owns the router; this packages the canonical
 * ?preview/?tab behavior).
 *
 * @param {object} [options]
 * @param {string} [options.defaultTab='overview'] - tab when `?tab` is absent or
 *   invalid; the tab a newly-opened/switched resource lands on.
 * @param {string[]} [options.tabs] - valid tab values. `?tab` outside this set is
 *   ignored (falls back to defaultTab). Omit to accept any `?tab` value.
 * @param {(id: string) => (void | Promise<void>)} [options.ensureLoaded] -
 *   caller's callback, run on resource-id change (and immediately on cold-load).
 *   Contract is "make sure this id's data is present", so implementations are free
 *   to skip what's already cached. If it throws, the preview auto-closes (a
 *   stale/deleted ?preview id shouldn't leave a broken open panel).
 * @returns {{
 *   resourceId: import('vue').ComputedRef<string|null>,
 *   isPreviewOpen: import('vue').Ref<boolean>,
 *   activeTab: import('vue').WritableComputedRef<string>,
 *   openPreview: (event: Event, row: { original: { id: string } }) => void,
 *   closePreview: () => void,
 * }}
 */
export function usePreviewPanel (options = {}) {
  const { defaultTab = 'overview', tabs, ensureLoaded } = options

  const route = useRoute()
  const router = useRouter()

  const resourceId = computed(() => route.query.preview ?? null)

  // Seeded once from the URL (cold-load auto-open), then owned locally.
  const isPreviewOpen = ref(!!resourceId.value)

  // Tab is URL-backed (?tab=) — addressable, refresh-stable, deep-linkable.
  // Read: the query value if it's a known tab, else the default. Write: replace
  // ?tab (keeping ?preview). Because resourceId reads ?preview (not ?tab), a
  // tab write is value-identical for resourceId → the load watch never re-fires.
  const activeTab = computed({
    get () {
      const tab = route.query.tab
      if (tab && (!tabs || tabs.includes(tab))) {
        return tab
      }
      return defaultTab
    },
    set (value) {
      router.replace({
        query: {
          ...route.query,
          tab: value,
        },
      })
    },
  })

  // True when the URL's ?tab is a real, valid tab (not absent/unknown).
  function hasValidTabInUrl () {
    const tab = route.query.tab
    return !!tab && (!tabs || tabs.includes(tab))
  }

  // Run the caller's ensureLoaded whenever the selected resource id changes.
  // immediate: on a cold hard-load the URL already carries ?preview=<id>, so
  // resourceId is born set and never "changes" — without immediate it never runs.
  // Matches the immediate id-watches in the tab leaves.
  watch(resourceId, async (id) => {
    if (!id) {
      return
    }
    // Cold-load canonicalization: a shared/typed `?preview=<id>` with no (or an
    // unknown) ?tab gets the default written in, so the URL always carries the
    // tab explicitly. Interactive opens already set ?tab in openPreview, so this
    // only fires on the cold-load path — never a double navigation.
    if (!hasValidTabInUrl()) {
      router.replace({
        query: {
          ...route.query,
          tab: defaultTab,
        },
      })
    }
    if (!ensureLoaded) {
      return
    }
    try {
      await ensureLoaded(id)
    }
    catch (err) {
      // The ?preview id points at something that no longer exists (deleted, or
      // a stale/hand-edited URL). Close instead of leaving a broken panel.
      console.warn(`[usePreviewPanel] ensureLoaded failed for ${id}, closing preview:`, err)
      isPreviewOpen.value = false
    }
  }, { immediate: true })

  function openPreview (event, row) {
    isPreviewOpen.value = true
    // Select the resource, KEEPING the current tab (sticky — reviewing images
    // and clicking through rows stays on Image). activeTab resolves to the
    // default when none/invalid is set, so this always writes an explicit tab.
    // If the new resource lacks that tab, the activeTab getter falls back to
    // default on read.
    router.replace({
      query: {
        ...route.query,
        preview: row.original.id,
        tab: activeTab.value,
      },
    })
  }

  // closePreview flips the open-state; the watch below clears the URL. Panel
  // visibility is driven by isPreviewOpen (the v-if), so closing MUST set it —
  // clearing the URL alone leaves isPreviewOpen true and the panel open. This is
  // the single close path for both the X button and esc.
  function closePreview () {
    isPreviewOpen.value = false
  }

  // When the panel closes, clear the URL params (?preview + ?tab).
  watch(isPreviewOpen, (value) => {
    if (!value) {
      const query = { ...route.query }
      delete query.preview
      delete query.tab
      router.replace({ query })
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
    resourceId,
    isPreviewOpen,
    activeTab,
    openPreview,
    closePreview,
  }
}
