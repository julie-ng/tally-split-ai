<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'

// Fast-edit view of an expense's SPLIT — amount, shares, who paid, settled.
// Replaces the old read-only view in the Overview tab: correcting a split is the
// common case, so it should not need an edit-mode switch.
//
// Ported from receipt/expense.vue with two changes:
//   - keyed by expenseId, not receiptId. That component self-fetched by receipt,
//     which cannot reach a standalone expense; here the panel already owns the id.
//   - the paid-by control is STACKED (URadioGroup, as in EditForm) rather than
//     three side-by-side cards, which do not fit the preview panel's width.
//
// Title, date and notes are NOT here — those live in ExpenseEditForm behind the
// Edit button, since they are rarely corrected and benefit from explicit save.
//
// Writes are DEBOUNCED and accumulated: every control writes into pendingUpdates
// and one PATCH flushes 500ms later, so dragging through several fields is a
// single request.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

defineEmits(['edit'])

const toast = useToast()
const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()

const expense = computed(() => expensesStore.getExpenseById(props.expenseId))

const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

// "Unsure" carries a sentinel — URadioGroup doesn't reliably match a literal
// null — and is mapped back to null on write. Same approach as EditForm.
const UNSURE = '__unsure__'

// Selected-state styling is per ITEM, not on the shared `ui.item` slot, because
// the two differ: a named payer is a resolved answer (primary), Unsure is an
// unresolved one (warning). Full literals — Tailwind purges anything it can't
// see as a whole string.
const SELECTED_MEMBER = 'has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary/30'
const SELECTED_UNSURE = 'has-data-[state=checked]:bg-warning/10 has-data-[state=checked]:border-warning/40 has-data-[state=checked]:text-warning'

const paidByItems = computed(() => {
  const items = []
  if (householdStore.userOne) {
    items.push({
      value: householdStore.userOne.id,
      label: user1Name.value,
      avatar: householdStore.getMemberAvatarUrl(householdStore.userOne.id),
      class: SELECTED_MEMBER,
    })
  }
  if (householdStore.userTwo) {
    items.push({
      value: householdStore.userTwo.id,
      label: user2Name.value,
      avatar: householdStore.getMemberAvatarUrl(householdStore.userTwo.id),
      class: SELECTED_MEMBER,
    })
  }
  items.push({
    value: UNSURE,
    label: 'Unsure',
    avatar: null,
    class: SELECTED_UNSURE,
  })
  return items
})

const pendingUpdates = ref({})

// IMPORTANT
// - Every read goes through here, NOT straight to the store. A staged edit lives
//   in pendingUpdates for 500ms before the PATCH fires, so a plain store read
//   returns the PRE-EDIT value for that whole window: the radio highlight lagged
//   a full second behind the click, and the settle guard still saw the old payer
//   after "Unsure" was picked (letting you settle an unattributed expense).
// - `in` rather than a truthy check — a staged `null` (Unsure) or `0` is a real
//   value and must win over the stored one.
function field (name) {
  return name in pendingUpdates.value
    ? pendingUpdates.value[name]
    : expense.value?.[name]
}

const sumsUp = computed(() => {
  const total = field('splitAmount')
  const one = field('userOneShare')
  const two = field('userTwoShare')
  if (total == null || one == null || two == null) {
    return false
  }
  return Math.abs((one + two) - total) < 0.01
})

const canSettle = computed(() => field('paidByUserId') != null)

const debouncedUpdate = useDebounceFn(async () => {
  const updates = { ...pendingUpdates.value }
  pendingUpdates.value = {}

  try {
    await expensesStore.updateExpense(props.expenseId, updates)
  }
  catch (err) {
    console.error('Auto-save failed:', err)
    toast.add({
      title: 'Error saving expense',
      description: err.message || 'Failed to save changes',
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  }
}, 500)

// A pending write is dropped when the previewed expense changes — it was keyed
// to the OLD id and would otherwise land on the new one.
watch(() => props.expenseId, () => {
  pendingUpdates.value = {}
})

function stageUpdate (field, value) {
  pendingUpdates.value[field] = value
  debouncedUpdate()
}

// An empty string is ignored rather than written as 0 — that's a field
// mid-clear, not an intent to zero it.
function moneyModel (name) {
  return computed({
    get: () => field(name),
    set: (value) => {
      if (value === '' || value == null) {
        return
      }
      stageUpdate(name, parseFloat(value))
    },
  })
}

const splitAmount = moneyModel('splitAmount')
const userOneShare = moneyModel('userOneShare')
const userTwoShare = moneyModel('userTwoShare')

const paidByUserId = computed({
  get: () => field('paidByUserId') ?? UNSURE,
  set: (value) => {
    const resolved = value === UNSURE ? null : value
    stageUpdate('paidByUserId', resolved)
    // Clearing the payer un-settles: "settled" means a specific person was
    // squared up, so it can't outlive knowing who paid. The toggle guard only
    // covers the other direction.
    if (resolved === null && isSettled.value) {
      stageUpdate('isSettled', false)
    }
  },
})

const isSettled = computed({
  get: () => !!field('isSettled'),
  set: value => stageUpdate('isSettled', value),
})

function toggleSettle () {
  if (!canSettle.value && !isSettled.value) {
    toast.add({
      title: 'Cannot settle without paid-by',
      description: 'Identify who paid before marking as settled.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    })
    return
  }
  isSettled.value = !isSettled.value
}

function splitEvenly () {
  const amount = expense.value?.splitAmount
  if (amount == null) {
    return
  }
  const half = Math.round((amount / 2) * 100) / 100
  stageUpdate('userOneShare', half)
  stageUpdate('userTwoShare', Math.round((amount - half) * 100) / 100)
}

function zeroOut () {
  stageUpdate('splitAmount', 0)
  stageUpdate('userOneShare', 0)
  stageUpdate('userTwoShare', 0)
  stageUpdate('paidByUserId', null)
  stageUpdate('isSettled', false)
}
</script>

<template>
  <div v-if="expense" class="space-y-4">
    <!-- Amount -->
    <div class="flex items-center justify-between gap-3 text-sm">
      <span class="font-medium shrink-0">Expense Amount</span>
      <div class="flex items-center gap-2">
        <span
          class="text-xs font-medium"
          :class="sumsUp ? 'text-success' : 'text-warning'"
        >
          {{ sumsUp ? 'Shares add up' : 'Shares do not add up' }}
        </span>
        <UInput
          v-model="splitAmount"
          type="number"
          step="0.01"
          min="0"
          name="splitAmount"
          class="w-28"
          variant="subtle"
          trailing-icon="i-lucide-euro"
          :ui="{
            base: `text-right tabular-nums ring-1 ${sumsUp ? 'ring-success' : 'ring-warning'}`,
            trailingIcon: 'size-4 text-dimmed',
          }"
        />
      </div>
    </div>

    <!-- Shares -->
    <div class="flex items-center justify-between gap-3 text-sm">
      <span class="font-medium shrink-0">{{ user1Name }}'s Share</span>
      <UInput
        v-model="userOneShare"
        type="number"
        step="0.01"
        min="0"
        name="userOneShare"
        class="w-28"
        variant="subtle"
        trailing-icon="i-lucide-euro"
        :ui="{ base: 'text-right tabular-nums', trailingIcon: 'size-4 text-dimmed' }"
      />
    </div>

    <div class="flex items-center justify-between gap-3 text-sm">
      <span class="font-medium shrink-0">{{ user2Name }}'s Share</span>
      <UInput
        v-model="userTwoShare"
        type="number"
        step="0.01"
        min="0"
        name="userTwoShare"
        class="w-28"
        variant="subtle"
        trailing-icon="i-lucide-euro"
        :ui="{ base: 'text-right tabular-nums', trailingIcon: 'size-4 text-dimmed' }"
      />
    </div>

    <!-- Reset actions -->
    <div class="flex justify-end gap-2">
      <UButton
        size="xs"
        variant="subtle"
        color="neutral"
        icon="i-lucide-zap"
        @click="splitEvenly"
      >
        Split 50/50
      </UButton>
      <UButton
        size="xs"
        variant="subtle"
        color="neutral"
        icon="i-lucide-eraser"
        @click="zeroOut"
      >
        Reset to zero
      </UButton>
    </div>

    <USeparator />

    <!-- Paid by. Three across — the label is on its own line, so the full panel
         width is available for the options. The indicator is hidden and the
         whole card carries the selected state; at this width a radio dot plus a
         name plus an avatar is too much for one cell. -->
    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium">Paid By</span>
      <!-- The per-member primary highlight is applied HERE rather than on the
           shared item slot, so it doesn't fight the warning class Unsure carries.
           indicator="hidden" is the supported prop for dropping the radio dot —
           at a third of the panel width, dot + avatar + name is too much. -->
      <URadioGroup
        v-model="paidByUserId"
        :items="paidByItems"
        variant="card"
        orientation="horizontal"
        indicator="hidden"
        :ui="{
          fieldset: 'gap-2',
          item: 'flex-1 min-w-0 px-2.5 py-2',
          wrapper: 'min-w-0',
        }"
      >
        <template #label="{ item }">
          <span class="flex items-center gap-2.5 min-w-0">
            <!-- No `src` for Unsure — UAvatar falls back to its own placeholder,
                 which is what the expenses table shows for an unattributed row.
                 Same control either way keeps the three cards aligned. -->
            <UAvatar
              :src="item.avatar"
              :alt="item.label"
              size="2xs"
              class="shrink-0"
            />
            <span class="truncate">{{ item.label }}</span>
          </span>
        </template>
      </URadioGroup>
    </div>

    <!-- Settled. A switch rather than a checkbox: the label states the CURRENT
         state, so on/off is unambiguous without reading the control. -->
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-medium">Settled</span>
      <USwitch
        :model-value="isSettled"
        :label="isSettled ? 'Settled' : 'Unsettled'"
        :ui="{ label: 'text-sm' }"
        @update:model-value="toggleSettle"
      />
    </div>

    <!-- Title, date and notes live behind this. -->
    <div class="flex justify-start pt-2">
      <UButton
        trailing-icon="i-lucide-pencil"
        color="neutral"
        variant="outline"
        @click="$emit('edit')"
      >
        Edit Details
      </UButton>
    </div>
  </div>
</template>
