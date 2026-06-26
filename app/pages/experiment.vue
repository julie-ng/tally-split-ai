<script setup>
// Resize experiment — final arrangement.
//
// Requirement: preview remembers its dragged width when reopened, AND Panel 1
// expands to FULL width when the preview is closed.
//
// Key insight from the @nuxt/ui source:
//  - UDashboardPanel always anchors its resize handle on its RIGHT edge
//    (no `side` prop), and when resizable it takes a FIXED --width. So a
//    resizable Panel 1 keeps its width and leaves empty space when the right
//    panel closes — NOT what we want.
//  - UDashboardSidebar DOES support `side="right"`, rendering its handle on its
//    LEFT edge. So the PREVIEW is a right-side sidebar (fixed, remembered width),
//    and Panel 1 is a plain non-resizable panel (flex-1) that fills whatever is
//    left — full width when the preview closes.
//
// Layout: [ Sidebar(left)  |  Panel 1 (flex-1)  |  Sidebar(right) = preview ]
definePageMeta({
  layout: false,
})

const showPreview = ref(true)

// Mocked preview tabs — Overview (numbers), Receipt (lazy image), History.
const activeTab = ref('overview')
const previewTabs = [
  { label: 'Overview', value: 'overview', slot: 'overview' },
  { label: 'Receipt', value: 'receipt', slot: 'receipt' },
  { label: 'History', value: 'history', slot: 'history' },
]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="experiment-sidebar"
      collapsible
      resizable
      class="bg-elevated/25"
    >
      <template #header>
        <span class="font-bold">Sidebar</span>
      </template>
      <template #default>
        <p class="text-sm text-muted px-1">
          Drag my right edge to resize.
        </p>
      </template>
    </UDashboardSidebar>

    <!-- Main panel: NOT resizable → flex-1, fills all remaining space. Goes
         full-width when the preview is closed. -->
    <UDashboardPanel id="exp-panel-1">
      <UDashboardNavbar title="Panel 1">
        <template #right>
          <UButton
            v-if="!showPreview"
            label="Open preview"
            icon="i-lucide-panel-right-open"
            color="neutral"
            variant="subtle"
            @click="showPreview = true"
          />
        </template>
      </UDashboardNavbar>

      <div class="p-4">
        <p class="text-sm text-muted">
          Panel 1 — I flex to fill. Close the preview and I take the full width.
        </p>
        <div class="h-40 rounded-lg bg-muted mt-4" />
        <div class="h-40 rounded-lg bg-muted mt-4" />
        <div class="h-40 rounded-lg bg-muted mt-4" />
      </div>
    </UDashboardPanel>

    <!-- Preview: a RIGHT-side sidebar so its handle is on the LEFT edge and it
         keeps a fixed, remembered width. -->
    <UDashboardSidebar
      v-if="showPreview"
      id="experiment-preview"
      side="right"
      resizable
      :default-size="24"
      :min-size="18"
      :max-size="48"
      class="bg-elevated/25"
      :ui="{
        // header: 'border-b border-default',
        footer: 'border-t border-default',
        // Body no longer scrolls itself; the tabs content does. min-h-0 lets
        // the inner flex child actually shrink so overflow kicks in.
        body: 'overflow-hidden min-h-0 p-0',
      }"
    >
      <template #header>
        <span class="font-bold flex-1">Preview</span>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          aria-label="Close preview"
          @click="showPreview = false"
        />
      </template>
      <template #default>
        <UTabs
          v-model="activeTab"
          :items="previewTabs"
          size="md"
          variant="link"
          color="primary"
          :ui="{
            indicator: 'border-b-3 border-primary',
            // NOTE: the first tab's text sits px-3 in from the gutter (the size
            // variant's trigger padding). Tried aligning it flush; not worth it —
            // reka positions the underline by measuring the trigger box, so any
            // text nudge desyncs the indicator + its animation. Left as-is.
            trigger: 'cursor-pointer',
            // Fill the body height as a column: fixed list on top, scrolling
            // content below. min-h-0 is the load-bearing bit on both the column
            // root and the scroll child.
            root: 'flex flex-col h-full min-h-0 w-full gap-0',
            list: 'shrink-0 px-4 gap-4',
            content: 'flex-1 overflow-y-auto min-h-0 px-4',
          }"
        >
          <!-- Overview: just the numbers -->
          <template #overview>
            <div class="pt-4 space-y-4">
              <p class="text-sm text-muted">
                Overview — expense numbers only (review mode).
              </p>
              <div
                v-for="n in 24"
                :key="n"
                class="h-[100px]
                rounded-lg
                bg-muted
                flex
                items-center
                justify-center
                text-sm
                text-muted
                shrink-0"
              >
                Number block {{ n }}
              </div>
            </div>
          </template>

          <!-- Receipt: lazy-loaded upload image -->
          <template #receipt>
            <div class="pt-4 space-y-4">
              <p class="text-sm text-muted">
                Receipt — lazy-loads the upload image to verify against.
              </p>
              <div class="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center text-sm text-muted">
                Receipt image placeholder
              </div>
            </div>
          </template>

          <!-- History: change timeline -->
          <template #history>
            <div class="pt-4 space-y-4">
              <p class="text-sm text-muted">
                History — change timeline.
              </p>
              <div
                v-for="n in 6"
                :key="n"
                class="border border-default rounded-lg p-4 text-sm text-muted"
              >
                Change entry {{ n }}
              </div>
            </div>
          </template>
        </UTabs>
      </template>
      <template #footer>
        <UButton
          label="Save"
          icon="i-lucide-check"
          color="primary"
        />
      </template>
    </UDashboardSidebar>
  </UDashboardGroup>
</template>
