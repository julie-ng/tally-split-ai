<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'

// Read-only text rendering of an expense (the Overview tab's view mode). Pure
// presentation: reads warm store getters by id, emits `edit` for the host to
// switch into the form. No fetching, no mutation.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

defineEmits(['edit'])

const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()

const expense = computed(() => expensesStore.getExpenseById(props.expenseId))

const userOne = computed(() => householdStore.userOne)
const userTwo = computed(() => householdStore.userTwo)
const user1Name = computed(() => householdStore.getMemberFirstName(userOne.value?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(userTwo.value?.id))

const paidByName = computed(() => {
  const id = expense.value?.paidByUserId
  return id ? householdStore.getMemberFirstName(id) : null
})

const paidByAvatar = computed(() => {
  const id = expense.value?.paidByUserId
  return id ? householdStore.getMemberAvatarUrl(id) : null
})

const sumsUp = computed(() => expensesStore.doesExpenseAddUp(props.expenseId))
const isSettled = computed(() => !!expense.value?.isSettled)

function amount (value) {
  return receiptUtils.formatAmount(value)
}
</script>

<template>
  <div class="space-y-5">
    <!-- Merchant (when the expense came from a receipt) -->
    <template v-if="expense.receipt?.merchantName">
      <div>
        <!-- <h3 class="text-sm font-semibold mb-2">
          Merchant
        </h3> -->
        <receipt-merchant-info
          :name="expense.receipt.merchantName"
          :address="expense.receipt.merchantAddress"
          :relaxed-line-height="true"
        />
      </div>

      <USeparator />
    </template>

    <h3 class="text-sm font-semibold">
      Split
    </h3>

    <!-- Amount + shares -->
    <dl class="space-y-3 text-sm">
      <div class="flex justify-between">
        <dt>
          Total
        </dt>
        <dd>
          {{ amount(expense.splitAmount) }}
        </dd>
      </div>
      <div class="flex justify-between">
        <dt>
          {{ user1Name }}'s share
        </dt>
        <dd>{{ amount(expense.userOneShare) }}</dd>
      </div>
      <div class="flex justify-between">
        <dt>
          {{ user2Name }}'s share
        </dt>
        <dd>{{ amount(expense.userTwoShare) }}</dd>
      </div>
    </dl>

    <!-- Shares-add-up note -->
    <p v-if="!sumsUp" class="text-xs text-warning flex items-center gap-1">
      <UIcon name="i-lucide-triangle-alert" class="size-3.5" />
      Shares do not add up to the total.
    </p>

    <USeparator />

    <!-- Paid by + settled -->
    <dl class="space-y-2 text-sm">
      <div class="flex justify-between">
        <dt>
          Paid by
        </dt>
        <dd class="flex items-center gap-2">
          <UAvatar
            v-if="paidByAvatar"
            :src="paidByAvatar"
            :alt="paidByName"
            size="xs"
          />
          {{ paidByName || 'Unsure' }}
        </dd>
      </div>
      <div class="flex justify-between items-center">
        <dt>
          Status
        </dt>
        <dd>
          <UBadge
            :label="isSettled ? 'Settled' : 'Unsettled'"
            :color="isSettled ? 'success' : 'warning'"
            variant="soft"
          />
        </dd>
      </div>
    </dl>

    <!-- Notes -->
    <div v-if="expense.notes">
      <h3 class="text-sm font-semibold text-muted mb-1">
        Notes
      </h3>
      <p class="text-sm whitespace-pre-line">
        {{ expense.notes }}
      </p>
    </div>

    <USeparator class="my-6" />

    <!-- LLM analysis (read-only) -->
    <ExpenseLLMAnalysis :expense-id="expenseId" />

    <!-- Edit -->
    <div class="flex justify-start pt-2">
      <UButton
        icon="i-lucide-pencil"
        color="neutral"
        variant="outline"
        @click="$emit('edit')"
      >
        Edit Expense
      </UButton>
    </div>
  </div>
</template>
