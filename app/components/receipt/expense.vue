<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'

const props = defineProps({
  receiptId: {
    type: String,
    required: true,
  },
})

const toast = useToast()
const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()
expensesStore.debug = true

const userOne = computed(() => householdStore.userOne)
const userTwo = computed(() => householdStore.userTwo)
const user1Name = computed(() => householdStore.getMemberFirstName(userOne.value?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(userTwo.value?.id))

// Radio-button options for paid-by selector. Only includes household members
// that exist (userTwo may be null in single-member households — but the
// outer v-if/v-else hides the whole component in that case).
const paidByOptions = computed(() => {
  const options = []
  if (userOne.value) options.push({ id: userOne.value.id, name: user1Name.value })
  if (userTwo.value) options.push({ id: userTwo.value.id, name: user2Name.value })
  return options
})

// ❗️ TODO: just always show errors in UI.
// const expenseErrors = computed(() => expensesStore.getExpenseError(props.expenseId))
// expensesStore.testErrors()

/**
 * Fetch expense data by receiptId — self-managed, works in both SSR and client-side navigation
 */
const expenseId = computed(() => expensesStore.getExpenseIdByReceiptId(props.receiptId))
const expenseLoading = computed(() => expensesStore.loading[`receipt:${props.receiptId}`] || (expenseId.value && expensesStore.isExpenseLoading(expenseId.value)) || false)
const fetchAttempted = ref(false)
expensesStore.fetchExpenseByReceiptId(props.receiptId)
  .then(() => {
    fetchAttempted.value = true
  })
  .catch(() => {
    fetchAttempted.value = true
  })

/**
 * UI Functionality
 */
const sumsUp = computed(() => expenseId.value
  ? expensesStore.doesExpenseAddUp(expenseId.value)
  : false,
)
const settledText = computed(() => isSettled.value ? 'Settled Up' : 'Unsettled')
const canSettle = computed(() => expenseId.value ? expensesStore.canSettleExpense(expenseId.value) : false)
const toggleSettle = () => {
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

const zeroOut = () => {
  pendingUpdates.value.splitAmount = 0
  pendingUpdates.value.userOneShare = 0
  pendingUpdates.value.userTwoShare = 0
  pendingUpdates.value.paidByUserId = null
  pendingUpdates.value.isSettled = false
  debouncedUpdate()
}

const expenseHalf = () => {
  pendingUpdates.value.userOneShare = expense.value?.splitAmount / 2
  pendingUpdates.value.userTwoShare = expense.value?.splitAmount / 2
  debouncedUpdate()
}

/**
 * Expense Refs
 */
const expense = computed(() => expensesStore.getExpenseByReceiptId(props.receiptId))
const noExpense = computed(() => fetchAttempted.value && !expenseLoading.value && !expense.value)

// Writable computed refs - all accumulate into pendingUpdates
const splitAmount = computed({
  get: () => expense.value?.splitAmount,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.splitAmount = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const paidByUserId = computed({
  get: () => expense.value?.paidByUserId,
  set: (value) => {
    pendingUpdates.value.paidByUserId = value
    debouncedUpdate()
  },
})

const userOneShare = computed({
  get: () => expense.value?.userOneShare,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userOneShare = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const userTwoShare = computed({
  get: () => expense.value?.userTwoShare,
  set: (value) => {
    if (value !== '') { // user clears field
      pendingUpdates.value.userTwoShare = parseFloat(value)
      debouncedUpdate()
    }
  },
})

const isSettled = computed({
  get: () => expense.value?.isSettled,
  set: (value) => {
    pendingUpdates.value.isSettled = value
    debouncedUpdate()
  },
})

/**
 * Update Expense (debounced & accumulated)
 */
const pendingUpdates = ref({})

// Single debounced update function that flushes accumulated changes
const debouncedUpdate = useDebounceFn(async () => {
  const updates = { ...pendingUpdates.value }
  pendingUpdates.value = {} // Clear accumulator

  try {
    await expensesStore.updateExpense(expenseId.value, updates)
  }
  catch (err) {
    showToast(err)
  }
}, 500)

/**
 * ------
 * Styles
 * ------
 */
const settledClass = computed(function () {
  return isSettled.value
    ? 'border-blue-400 text-blue-700 bg-blue-50'
    : 'border-default'
})

/**
 * Helpers
 */
function showToast (err) {
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
    <!-- Single-member household — expenseting is meaningless -->
    <div v-if="!householdStore.hasTwoMembers" class="text-sm text-dimmed">
      Expenseting is only possible if your household has more than 2 members.
    </div>

    <template v-else>
      <!-- Loading state -->
      <template v-if="expenseLoading && !expense">
        <div class="space-y-3 animate-pulse">
          <div class="h-8 bg-elevated rounded" />
          <div class="h-8 bg-elevated rounded" />
          <div class="h-8 bg-elevated rounded" />
          <div class="h-8 bg-elevated rounded" />
        </div>
      </template>

      <!-- No expense assigned -->
      <div v-else-if="noExpense" class="text-sm text-dimmed">
        No expense assigned to this receipt
      </div>

      <div v-else-if="expense">
        <!-- Expense Amount -->
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
            <!-- <ui-saved-inline-alert /> -->
          </div>
          <div class="text-right">
            <receipt-expense-paid-by
              v-model="paidByUserId"
              :users="paidByOptions"
            />
          </div>
        </section>

        <!-- User One Share -->
        <receipt-expense-input
          v-model="userOneShare"
          :label="`${user1Name}'s Share`"
          :sums-up="sumsUp"
          input-name="userOneShare"
        />

        <!-- User Two Share -->
        <receipt-expense-input
          v-model="userTwoShare"
          :label="`${user2Name}'s Share`"
          :sums-up="sumsUp"
          input-name="userTwoShare"
        />

        <!-- Settle Button -->
        <div class="mt-4 border rounded-md p-3 grid grid-cols-2 cursor-pointer hover:bg-muted" :class="settledClass" @click="toggleSettle">
          <div class="text-left">
            <div class="text-sm">
              {{ settledText }}
            </div>
          </div>
          <div class="flex justify-end">
            <UCheckbox v-model="isSettled" class="cursor-pointer" />
          </div>
        </div>

        <div class="flex justify-between items-center mt-3 text-sm">
          <div>Reset</div>
          <div>
            <UButton
              variant="solid"
              color="neutral"
              class="mr-2 cursor-pointer"
              icon="i-lucide-zap"
              @click="expenseHalf"
            >
              Expense 50/50
            </UButton>
            <UButton
              variant="solid"
              color="neutral"
              class="cursor-pointer"
              icon="i-lucide-eraser"
              @click="zeroOut"
            >
              Reset to zero
            </UButton>
          </div>
        </div>

        <USeparator class="my-6" />
        <ExpenseLLMAnalysis v-if="expenseId" :expense-id="expenseId" />

      <!-- <div class="text-right">
        <UButton
          color="secondary"
          class="mt-3 cursor-pointer"
          icon="i-lucide-save"
        >
          Update Expense
        </UButton>
      </div> -->
      </div>
    </template>
  </ClientOnly>
</template>
