<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useHistoryStore } from '~/stores/history.store'
import { useHouseholdStore } from '~/stores/household.store'

// History tab of the expense preview. One merged timeline of BOTH the expense's
// changes (split edits, settle, paid-by) and its receipt's (OCR corrections,
// normalization) — the user thinks of them as one thing. Standalone expenses
// have no receipt and simply merge to their own entries.
//
// The receiptId comes off the expense the panel already warmed, so this stays an
// automatic chain rather than a second source of truth for the id.
//
// Reused-leaf rule: this is mounted once and reused as the preview swaps rows,
// so both fetches key off the ids in an immediate watch (a setup-only fetch
// would load just the first expense). See the preview-panel leaf gotcha.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
const historyStore = useHistoryStore()
const householdStore = useHouseholdStore()

const receiptId = computed(() => expensesStore.getExpenseById(props.expenseId)?.receiptId ?? null)

// Watches the PAIR: receiptId resolves a tick after expenseId on a cold load
// (the expense has to arrive first), so watching only expenseId would miss it.
watch([() => props.expenseId, receiptId], ([expenseId, currentReceiptId]) => {
  if (expenseId) {
    historyStore.fetchExpenseHistory(expenseId)
  }
  if (currentReceiptId) {
    historyStore.fetchReceiptHistory(currentReceiptId)
  }
}, { immediate: true })

const entries = computed(() => {
  const merged = historyStore.getMergedHistory(props.expenseId, receiptId.value)
  if (!merged) {
    return merged // undefined (loading) passes through
  }
  return merged.map(entry => ({
    ...entry,
    src: describeChangeSource(entry.source, householdStore),
  }))
})

// undefined until both fetches resolve; [] once loaded + genuinely empty.
const pending = computed(() => entries.value === undefined)
</script>

<template>
  <div class="px-4 py-6">
    <h1 class="mb-6 text-md font-bold text-default">
      Change History
    </h1>

    <!-- Loading -->
    <!-- Indented past the rail so the cards don't shift sideways once loaded. -->
    <div v-if="pending" class="space-y-4 pl-9">
      <USkeleton class="h-24 w-full rounded-lg" />
      <USkeleton class="h-24 w-full rounded-lg" />
    </div>

    <!-- Empty -->
    <div v-else-if="entries.length === 0" class="text-muted text-sm py-10 text-center">
      No changes recorded.
    </div>

    <!-- Timeline. Mirrors the workflow timeline's rail (UploadWorkflowTimeline),
         with the change's AVATAR standing in for that one's status dot. -->
    <ol v-else class="relative">
      <!-- Change ids are only unique WITHIN an entity type, so the two merged
           streams can collide on id alone. -->
      <li
        v-for="(entry, i) in entries"
        :key="`${entry.entityType}-${entry.id}`"
        class="relative flex gap-3 pb-4 last:pb-0"
      >
        <!-- Connector (this avatar → next). left-[11px] centres it under a
             size-6 avatar; hidden on the last entry. -->
        <span
          v-if="i !== entries.length - 1"
          class="absolute left-[11px] top-9 -bottom-0 w-px bg-neutral-300 dark:bg-neutral-600"
          aria-hidden="true"
        />

        <!-- Who made the change, sitting ON the rail. mt-3 aligns it with the
             header text, which sits below the card's top padding. -->
        <!-- size-6 (24px) — a touch larger than the workflow timeline's size-5
             status dot, since a face needs more room to read than a glyph. The
             connector's left offset is paired to this. Set via the class, not
             the `size` prop: the utility has to win, and two would fight. -->
        <UAvatar
          v-if="entry.src.isBot"
          icon="i-lucide-bot"
          class="relative z-10 mt-2.5 size-6 shrink-0 bg-elevated text-dimmed ring ring-default"
          :ui="{ icon: 'size-3.5' }"
        />
        <UAvatar
          v-else
          :src="entry.src.avatar"
          :alt="entry.src.label"
          class="relative z-10 mt-2.5 size-6 shrink-0 ring ring-default"
        />

        <UiCollapsibleCard
          class="flex-1 min-w-0"
          padding="sm"
          default-open
        >
          <template #header>
            <!-- Same weight for both principals — a task is an author here, not
                 metadata. Mono is kept for tasks so `task:adjust-expense` reads
                 as an identifier rather than a name. -->
            <span
              class="text-xs font-medium truncate"
              :class="entry.src.isBot ? 'font-mono' : ''"
            >
              {{ entry.src.label }}
            </span>
          </template>

          <template #actions>
            <time :datetime="entry.createdAt" class="text-xs text-dimmed">
              {{ timestampUtils.toRelative(entry.createdAt) }}
            </time>
            <UBadge
              :label="entry.entityType"
              :color="entry.entityType === 'receipt' ? 'primary' : 'info'"
              variant="subtle"
              size="sm"
            />
          </template>

          <!-- Field changes -->
          <div class="px-1">
            <ExpenseHistoryFields :fields="entry.fields" />
          </div>
        </UiCollapsibleCard>
      </li>
    </ol>
  </div>
</template>
