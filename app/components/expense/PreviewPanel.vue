<script setup>
import { toBerlinLongDate, toBerlinTime } from '#shared/utils/expense-date.utils.js'
// Resizable side-panel presentation of the expense preview, for review-heavy
// pages (e.g. the monthly list). Sibling alternative to PreviewSlideover.vue.
//
// It is a RIGHT-side UDashboardSidebar (not a UDashboardPanel) so its resize
// handle sits on its LEFT edge and it holds a fixed, remembered width — letting
// the main table panel flex to full width when this closes. See the resize
// experiment for why the sidebar (not panel) is the right primitive here.
//
// Behaviour (open-state, ?preview URL sync, esc, tab reset) lives in
// useExpensePreview(); this owns only layout + tabs. Leaf content is keyed by
// expenseId and read from the store (warm) — no fetching here.
const open = defineModel('open', {
  type: Boolean,
  default: false,
})

const activeTab = defineModel('activeTab', {
  type: String,
  default: 'overview',
})

const props = defineProps({
  // The previewed expense (carries title + embedded receipt).
  expense: {
    type: Object,
    default: null,
  },
  // The previewed expense id, passed to the content leaves.
  expenseId: {
    type: [String, null],
    default: null,
  },
})

// expense.date is a UTC instant; show it as the Berlin calendar day (long form)
// plus the time of day, e.g. "7 April 2006 · 14:30".
const formattedDate = computed(() => {
  const date = toBerlinLongDate(props.expense?.date)
  if (!date) {
    return null
  }
  const time = toBerlinTime(props.expense?.date)
  return time ? `${date} · ${time}` : date
})

const tabs = [
  { label: 'Overview', value: 'overview', slot: 'overview' },
  { label: 'Receipt', value: 'receipt', slot: 'receipt' },
  { label: 'History', value: 'history', slot: 'history' },
]
</script>

<template>
  <!-- Own UDashboardGroup so the preview's sidebar gets an ISOLATED collapse
       context. Two UDashboardSidebars sharing one group's `sidebarCollapsed`
       ref clobber each other: the preview (collapsible:false) writes `false`
       to the shared ref on mount, breaking the nav's collapse toggle. A nested
       group gives the preview its own ref to write to. unit="rem" matches the
       app group so the resize math stays in rem. -->
  <UDashboardGroup v-if="open" unit="rem" class="contents">
    <UDashboardSidebar
      id="expense-preview"
      side="right"
      resizable
      :default-size="28"
      :min-size="22"
      :max-size="48"
      class="bg-elevated/25"
      :ui="{
        // overflow-hidden + min-w-0 clip children to the sidebar's --width.
        // Without it, a long un-broken title (e.g. 'Scanned_20260415-1048-08')
        // expands the flex column past --width and pushes the X off-screen.
        root: 'overflow-hidden min-w-0',
        // Header holds two stacked lines (title + date), so let it grow past the
        // default fixed single-row height. items-start keeps the X top-aligned.
        header: 'h-auto py-3 items-start min-w-0',
        // Body no longer scrolls itself; the tab content does. min-h-0 lets the
        // inner flex child shrink so overflow kicks in.
        body: 'overflow-hidden min-h-0 min-w-0 p-0',
      }"
    >
      <template #header>
        <!-- w-full + min-w-0 so the title can truncate instead of widening the
           sidebar and pushing the X off-screen. pl-2 matches tab contents. -->
        <div class="w-full min-w-0 pl-2">
          <div class="flex items-center gap-2 min-w-0">
            <p class="font-bold flex-1 min-w-0 truncate text-primary">
              {{ expense?.title || 'Expense' }}
            </p>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              aria-label="Close preview"
              class="shrink-0"
              @click="open = false"
            />
          </div>
          <p class="text-sm text-dimmed truncate">
            {{ formattedDate || 'No date' }}
          </p>
        </div>
      </template>

      <template #default>
        <UTabs
          v-model="activeTab"
          :items="tabs"
          size="md"
          variant="link"
          color="primary"
          :ui="{
            indicator: 'border-b-3 border-primary',
            trigger: 'cursor-pointer',
            // Column: fixed list on top, scrolling content below. min-h-0 on both
            // the column root and the scroll child is load-bearing.
            root: 'flex flex-col h-full min-h-0 w-full gap-0',
            list: 'shrink-0 px-4 gap-4',
            content: 'flex-1 overflow-y-auto min-h-0 px-4',
          }"
        >
          <template #overview>
            <div class="py-4">
              <ExpenseOverviewTab v-if="expenseId" :expense-id="expenseId" />
            </div>
          </template>

          <template #receipt>
            <ExpenseReceiptTab v-if="expenseId" :expense-id="expenseId" />
          </template>

          <template #history>
            <ExpenseHistoryTab v-if="expenseId" :expense-id="expenseId" />
          </template>
        </UTabs>
      </template>
    </UDashboardSidebar>
  </UDashboardGroup>
</template>
