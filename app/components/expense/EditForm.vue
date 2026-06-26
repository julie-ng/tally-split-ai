<script setup>
import { parseDate, Time } from '@internationalized/date'
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'
import { toUtcInstant, toBerlinISODate, toBerlinTime } from '#shared/utils/expense-date.utils.js'

// Edit form for an EXISTING expense. Mirrors CreateForm.vue's layout/validation
// but seeds from the store row and saves via updateExpense (vs. createExpense).
// Kept separate from CreateForm so the proven create flow stays untouched.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['saved', 'cancel'])

const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()

const expense = computed(() => expensesStore.getExpenseById(props.expenseId))

const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

// Paid-by radio options. "Unsure" carries the sentinel UNSURE (URadioGroup
// doesn't reliably match a literal null); mapped back to null in the payload.
const UNSURE = '__unsure__'
const paidByItems = computed(() => {
  const items = []
  if (householdStore.userOne) {
    items.push({
      value: householdStore.userOne.id,
      label: user1Name.value,
      avatar: householdStore.getMemberAvatarUrl(householdStore.userOne.id),
    })
  }
  if (householdStore.userTwo) {
    items.push({
      value: householdStore.userTwo.id,
      label: user2Name.value,
      avatar: householdStore.getMemberAvatarUrl(householdStore.userTwo.id),
    })
  }
  items.push({ value: UNSURE, label: 'Unsure', avatar: null })
  return items
})

const round2 = n => Math.round(n * 100) / 100

// Seed the form from the stored expense. date/time are derived from the UTC
// instant back into Berlin wall-clock parts; midnight → no real time (null).
function seedForm () {
  const e = expense.value
  const berlinDay = toBerlinISODate(e?.date) // "YYYY-MM-DD" or null
  const berlinTime = toBerlinTime(e?.date) // "HH:MM" or null
  let time = null
  if (berlinTime && berlinTime !== '00:00') {
    const [h, m] = berlinTime.split(':').map(Number)
    time = new Time(h, m)
  }
  return {
    title: e?.title ?? '',
    date: berlinDay ? parseDate(berlinDay) : null,
    time,
    splitAmount: e?.splitAmount ?? null,
    userOneShare: e?.userOneShare ?? null,
    userTwoShare: e?.userTwoShare ?? null,
    paidByUserId: e?.paidByUserId ?? UNSURE,
    isSettled: e?.isSettled ?? false,
    notes: e?.notes ?? '',
  }
}

const form = ref(seedForm())

const submitError = ref(null)
const saving = computed(() => expensesStore.isExpenseSaving(props.expenseId))

// Shares hold once the user edits them (asymmetric split); a zero total forces
// both to 0.
const sharesTouched = ref(false)

watch(() => form.value.splitAmount, (amount) => {
  if (amount == null) {
    return
  }
  if (amount === 0) {
    sharesTouched.value = false
    form.value.userOneShare = 0
    form.value.userTwoShare = 0
    return
  }
  if (sharesTouched.value) {
    return
  }
  const half = round2(amount / 2)
  form.value.userOneShare = half
  form.value.userTwoShare = round2(amount - half)
})

function onShareInput (which, value) {
  sharesTouched.value = true
  const amount = form.value.splitAmount ?? 0
  const parsed = value === '' || value == null ? null : parseFloat(value)
  if (which === 'one') {
    form.value.userOneShare = parsed
    form.value.userTwoShare = parsed == null ? null : round2(amount - parsed)
  }
  else {
    form.value.userTwoShare = parsed
    form.value.userOneShare = parsed == null ? null : round2(amount - parsed)
  }
}

function splitEvenly () {
  sharesTouched.value = false
  const amount = form.value.splitAmount
  if (amount == null) {
    form.value.userOneShare = null
    form.value.userTwoShare = null
    return
  }
  const half = round2(amount / 2)
  form.value.userOneShare = half
  form.value.userTwoShare = round2(amount - half)
}

const sharesSumOk = computed(() => {
  const { splitAmount, userOneShare, userTwoShare } = form.value
  if (splitAmount == null || userOneShare == null || userTwoShare == null) {
    return false
  }
  return Math.abs((userOneShare + userTwoShare) - splitAmount) < 0.01
})

const showSumState = computed(() => {
  const { splitAmount, userOneShare, userTwoShare } = form.value
  return splitAmount != null && userOneShare != null && userTwoShare != null
})

const sumBorderClass = computed(() => {
  if (!showSumState.value) {
    return ''
  }
  return sharesSumOk.value ? 'ring-success' : 'ring-warning'
})

const canSettle = computed(() => form.value.paidByUserId !== UNSURE)

watch(canSettle, (allowed) => {
  if (!allowed) {
    form.value.isSettled = false
  }
})

const canSubmit = computed(() =>
  form.value.splitAmount != null
  && form.value.splitAmount >= 0
  && !!form.value.date
  && sharesSumOk.value,
)

async function handleSubmit () {
  submitError.value = null

  const payload = {
    title: form.value.title.trim() || null,
    splitAmount: form.value.splitAmount,
    userOneShare: form.value.userOneShare,
    userTwoShare: form.value.userTwoShare,
    paidByUserId: form.value.paidByUserId === UNSURE ? null : form.value.paidByUserId,
    isSettled: form.value.isSettled,
    notes: form.value.notes.trim() || null,
    date: form.value.date
      ? toUtcInstant(form.value.date, form.value.time)
      : null,
  }

  try {
    await expensesStore.updateExpense(props.expenseId, payload)
    emit('saved')
  }
  catch (err) {
    submitError.value = err?.data?.message || err?.message || 'Could not save changes.'
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <!-- Title -->
    <div class="flex flex-col gap-1">
      <label for="edit-expense-title" class="text-sm font-semibold">Title</label>
      <UInput
        id="edit-expense-title"
        v-model="form.title"
        placeholder="e.g. Groceries"
        autofocus
      />
    </div>

    <!-- Date / Time -->
    <div class="flex gap-3">
      <div class="flex flex-col gap-1">
        <label for="edit-expense-date" class="text-sm font-semibold">Date</label>
        <UInputDate id="edit-expense-date" v-model="form.date">
          <template #trailing>
            <UPopover>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                aria-label="Select a date"
                class="px-0"
              />
              <template #content>
                <UCalendar v-model="form.date" class="p-2" />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </div>

      <div class="flex flex-col gap-1">
        <label for="edit-expense-time" class="text-sm font-semibold">
          Time <span class="text-dimmed font-normal">(optional)</span>
        </label>
        <UInputTime id="edit-expense-time" v-model="form.time" />
      </div>
    </div>

    <USeparator type="dashed" class="mt-3 mb-2" />

    <h2 class="text-sm font-semibold">
      Split Amounts
    </h2>
    <!-- Split Amount -->
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <label for="edit-expense-amount" class="text-sm">Total (EUR)</label>
        <span
          v-if="showSumState"
          class="text-xs font-medium"
          :class="sharesSumOk ? 'text-success' : 'text-warning'"
        >
          {{ sharesSumOk ? 'Shares add up' : 'Shares do not add up' }}
        </span>
      </div>
      <UInput
        id="edit-expense-amount"
        v-model.number="form.splitAmount"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        required
        :ui="{ base: sumBorderClass }"
      />
      <p class="text-xs text-dimmed">
        Edit a share below to split unevenly.
      </p>
    </div>

    <!-- Shares -->
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label for="edit-expense-user-one-share" class="text-sm">
          {{ user1Name }}'s Share
        </label>
        <UInput
          id="edit-expense-user-one-share"
          :model-value="form.userOneShare"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          :ui="{ base: sumBorderClass }"
          @update:model-value="onShareInput('one', $event)"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="edit-expense-user-two-share" class="text-sm">
          {{ user2Name }}'s Share
        </label>
        <UInput
          id="edit-expense-user-two-share"
          :model-value="form.userTwoShare"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          :ui="{ base: sumBorderClass }"
          @update:model-value="onShareInput('two', $event)"
        />
      </div>
    </div>

    <div class="flex">
      <UButton color="neutral" variant="subtle" @click="splitEvenly">
        Split evenly
      </UButton>
    </div>

    <USeparator type="dashed" class="mt-3 mb-2" />

    <!-- Paid By -->
    <div class="flex flex-col gap-1">
      <span class="text-sm font-semibold">Paid By</span>
      <URadioGroup
        v-model="form.paidByUserId"
        :items="paidByItems"
        indicator="end"
        variant="card"
        :ui="{
          fieldset: 'gap-y-2',
          item: 'has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary/30',
        }"
      >
        <template #label="{ item }">
          <span class="flex items-center gap-2">
            <UAvatar
              v-if="item.avatar"
              :src="item.avatar"
              :alt="item.label"
              size="2xs"
            />
            {{ item.label }}
          </span>
        </template>
      </URadioGroup>
    </div>

    <!-- Settled -->
    <UCheckbox
      v-model="form.isSettled"
      label="Mark as settled"
      :description="canSettle ? '' : 'Identify who paid before marking as settled.'"
      :disabled="!canSettle"
      :ui="{
        label: 'text-sm font-normal',
        description: 'text-xs min-h-4',
      }"
    />

    <USeparator type="dashed" class="mt-3 mb-2" />

    <!-- Notes -->
    <div class="flex flex-col gap-1">
      <label for="edit-expense-notes" class="text-sm font-semibold">Notes (optional)</label>
      <UTextarea id="edit-expense-notes" v-model="form.notes" :rows="3" />
    </div>

    <p v-if="submitError" class="text-sm text-error">
      {{ submitError }}
    </p>

    <!-- Save / Cancel -->
    <div class="flex justify-end gap-2 pt-2">
      <UButton color="neutral" variant="ghost" @click="emit('cancel')">
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="saving"
        :disabled="!canSubmit"
      >
        Save
      </UButton>
    </div>
  </form>
</template>
