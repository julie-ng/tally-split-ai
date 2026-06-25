<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'
import { toBerlinDisplayDate } from '#shared/utils/expense-date.utils.js'

const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const toast = useToast()
const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()

// Read straight from the store by expenseId — the list/page already loaded the
// expense, so this getter is warm. No fetch, no receiptId indirection. Works
// for standalone expenses (no receipt) too, since nothing here gates on receipt.
const expense = computed(() => expensesStore.getExpenseById(props.expenseId))

// Show the loading skeleton only on genuine first load — i.e. when this panel
// is handed an expenseId that isn't in the store yet (a deep-link/swap before
// the list loaded it). Saves no longer blank the expense (the store updates in
// place), so once we've seen it, it stays.
const hasLoaded = ref(false)
watch(expense, (value) => {
  if (value) {
    hasLoaded.value = true
  }
}, { immediate: true })

const formattedDate = computed(() => toBerlinDisplayDate(expense.value?.date))

// -------- Household members (for paid-by + share labels) --------
const userOne = computed(() => householdStore.userOne)
const userTwo = computed(() => householdStore.userTwo)
const user1Name = computed(() => householdStore.getMemberFirstName(userOne.value?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(userTwo.value?.id))

// Computed (not a one-time loop) so options track async household load.
const paidByOptions = computed(() => {
  const options = []
  if (userOne.value) {
    options.push({ id: userOne.value.id, name: user1Name.value })
  }
  if (userTwo.value) {
    options.push({ id: userTwo.value.id, name: user2Name.value })
  }
  return options
})

// -------- Derived expense state --------
const sumsUp = computed(() => expensesStore.doesExpenseAddUp(props.expenseId))
const canSettle = computed(() => expensesStore.canSettleExpense(props.expenseId))
const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')

// -------- Editing: read view IS the edit view --------
// Every field is a live input bound to a writable computed. Edits accumulate
// into `pendingUpdates` and flush via one debounced save — no edit mode, no
// save button. Read and edit are the same surface; you just click and type.
const pendingUpdates = ref({})

const debouncedSave = useDebounceFn(async () => {
  const updates = { ...pendingUpdates.value }
  pendingUpdates.value = {}
  try {
    await expensesStore.updateExpense(props.expenseId, updates)
  }
  catch (err) {
    showError(err)
  }
}, 500)

// Writable computed factory: get from the live expense, set into the pending
// accumulator + schedule a save. `parse` lets numeric fields ignore empties.
function field (key, parse = v => v) {
  return computed({
    get: () => expense.value?.[key],
    set: (value) => {
      if (value === '') {
        return
      }
      pendingUpdates.value[key] = parse(value)
      debouncedSave()
    },
  })
}

const splitAmount = field('splitAmount', parseFloat)
const userOneShare = field('userOneShare', parseFloat)
const userTwoShare = field('userTwoShare', parseFloat)
const paidByUserId = field('paidByUserId')
const isSettled = field('isSettled')

// -------- Actions --------
function toggleSettle () {
  if (!canSettle.value && !isSettled.value) {
    toast.add({
      title: 'Cannot settle without paid-by',
      description: 'Identify who paid before marking as settled.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
      timeout: 4000,
    })
    return
  }
  isSettled.value = !isSettled.value
}

function splitEvenly () {
  const half = (expense.value?.splitAmount ?? 0) / 2
  pendingUpdates.value.userOneShare = half
  pendingUpdates.value.userTwoShare = half
  debouncedSave()
}

function resetToZero () {
  Object.assign(pendingUpdates.value, {
    splitAmount: 0,
    userOneShare: 0,
    userTwoShare: 0,
    paidByUserId: null,
    isSettled: false,
  })
  debouncedSave()
}

// -------- Styles / helpers --------
const settledClass = computed(() => isSettled.value
  ? 'border-blue-400 text-blue-700 bg-blue-50'
  : 'border-default',
)

function showError (err) {
  console.error('Auto-save failed:', err)
  toast.add({
    title: 'Error saving expense',
    description: err.message || 'Failed to save changes',
    color: 'error',
    icon: 'i-lucide-triangle-alert',
    timeout: 5000,
    ui: { root: 'bg-elevated' },
  })
}
</script>

<template>
  <ClientOnly>
    <!-- Single-member household: splitting is meaningless -->
    <div v-if="!householdStore.hasTwoMembers" class="text-sm text-dimmed">
      Splitting is only possible if your household has more than one member.
    </div>

    <!-- Skeleton only on genuine first load — NOT on the brief undefined gap
         during save-refetch (hasLoaded stays true through it). -->
    <div v-else-if="!hasLoaded" class="space-y-3 animate-pulse">
      <div class="h-8 bg-elevated rounded" />
      <div class="h-8 bg-elevated rounded" />
      <div class="h-8 bg-elevated rounded" />
      <div class="h-8 bg-elevated rounded" />
    </div>

    <div v-else class="space-y-5">
      <!-- Title & date -->
      <div>
        <h2 class="text-xl font-bold">
          {{ expense.title || 'Untitled expense' }}
        </h2>
        <p class="text-sm text-muted mt-1">
          {{ formattedDate || 'No date' }}
        </p>
      </div>

      <USeparator />

      <!-- Expense amount -->
      <receipt-expense-input
        v-model="splitAmount"
        :sums-up="sumsUp"
        label="Expense Amount"
        input-name="splitAmount"
        :highlight-on-success="true"
      >
        <template v-if="sumsUp" #success>
          Shares add up
        </template>
        <template v-if="!sumsUp" #warn>
          Shares do not add up
        </template>
      </receipt-expense-input>

      <!-- Paid by -->
      <section class="flex justify-between items-center my-2 text-sm">
        <div class="font-medium">
          Paid By
        </div>
        <div class="text-right">
          <receipt-expense-paid-by
            v-model="paidByUserId"
            :users="paidByOptions"
          />
        </div>
      </section>

      <!-- Shares -->
      <receipt-expense-input
        v-model="userOneShare"
        :label="`${user1Name}'s Share`"
        :sums-up="sumsUp"
        input-name="userOneShare"
      />
      <receipt-expense-input
        v-model="userTwoShare"
        :label="`${user2Name}'s Share`"
        :sums-up="sumsUp"
        input-name="userTwoShare"
      />

      <!-- Settle toggle -->
      <div
        class="mt-4 border rounded-md p-3 grid grid-cols-2 cursor-pointer hover:bg-muted"
        :class="settledClass"
        @click="toggleSettle"
      >
        <div class="text-left text-sm">
          {{ settledText }}
        </div>
        <div class="flex justify-end">
          <UCheckbox v-model="isSettled" class="cursor-pointer" />
        </div>
      </div>

      <!-- Quick actions -->
      <div class="flex justify-between items-center mt-3 text-sm">
        <div>Reset</div>
        <div class="flex gap-2">
          <UButton
            variant="solid"
            color="neutral"
            class="cursor-pointer"
            icon="i-lucide-zap"
            @click="splitEvenly"
          >
            Split 50/50
          </UButton>
          <UButton
            variant="solid"
            color="neutral"
            class="cursor-pointer"
            icon="i-lucide-eraser"
            @click="resetToZero"
          >
            Reset to zero
          </UButton>
        </div>
      </div>

      <USeparator class="my-6" />

      <!-- LLM analysis (read-only) -->
      <expense-llm-analysis :expense-id="expenseId" />

      <USeparator class="my-6" />

      <!-- Link to the source receipt's full detail page, if linked -->
      <div v-if="expense.receiptId">
        <UButton
          :to="`/receipts/${expense.receiptId}`"
          variant="subtle"
          color="neutral"
          icon="i-lucide-receipt"
        >
          Go to Receipt
        </UButton>
      </div>
    </div>
  </ClientOnly>
</template>
