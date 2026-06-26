<script setup>
import { today, getLocalTimeZone } from '@internationalized/date'
import { useExpensesStore } from '~/stores/expenses.store'
import { useHouseholdStore } from '~/stores/household.store'
import { useUserStore } from '~/stores/user.store'
import { toUtcInstant } from '#shared/utils/expense-date.utils.js'

defineProps({
  // Lets a host render a submit button OUTSIDE the form (e.g. in a slideover
  // footer) via native <button type="submit" :form="formId"> association.
  formId: {
    type: String,
    default: 'expense-create-form',
  },
})

const emit = defineEmits(['created', 'cancel'])

const expensesStore = useExpensesStore()
const householdStore = useHouseholdStore()
const userStore = useUserStore()

const user1Name = computed(() => householdStore.getMemberFirstName(householdStore.userOne?.id))
const user2Name = computed(() => householdStore.getMemberFirstName(householdStore.userTwo?.id))

// Paid-by radio options. "Unsure" carries the sentinel UNSURE (not literal null —
// URadioGroup doesn't reliably match a null value); we map it back to null in the
// payload. Each member item carries avatarUrl for the custom #label slot.
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

// Minimal form. The API stamps householdId, assigns member slots, and defaults
// the shares to a 50/50 split of the amount — so we collect a title, date,
// optional time, the amount, plus optional notes. Asymmetric per-person
// splitting is a separate, not-yet-built feature.
//
// date  — CalendarDate (UInputDate), required, defaults to today. Manual entry
//         is usually for a PAST expense (a lost/forgotten receipt).
// time  — Time (UInputTime), OPTIONAL. Left empty → stored at midnight, a
//         legible "manually entered, no real time" sentinel. The user can type
//         a rough time (e.g. 12:00) if they care about same-day ordering.
const form = ref({
  title: '',
  date: today(getLocalTimeZone()),
  time: null,
  splitAmount: null,
  userOneShare: null,
  userTwoShare: null,
  // Default to the logged-in user — you usually paid for what you're logging.
  // Falls back to "Unsure" if the session isn't loaded yet.
  paidByUserId: userStore.userId ?? UNSURE,
  isSettled: false,
  notes: '',
})

const submitError = ref(null)

const saving = computed(() => expensesStore.saving.create || false)

// Shares auto-fill to a 50/50 split of the amount until the user edits one.
// Once touched, they hold (the user is setting an asymmetric split by hand).
const sharesTouched = ref(false)

watch(() => form.value.splitAmount, (amount) => {
  if (amount == null) {
    return
  }
  // A zero total has no asymmetric split — force both shares to 0 even if the
  // user had hand-edited them.
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
  form.value.userTwoShare = round2(amount - half) // absorbs odd cents
})

// Editing one share auto-completes the other so they always sum to the amount.
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

// Shares must sum to the amount (within a cent) before submit.
const sharesSumOk = computed(() => {
  const { splitAmount, userOneShare, userTwoShare } = form.value
  if (splitAmount == null || userOneShare == null || userTwoShare == null) {
    return false
  }
  return Math.abs((userOneShare + userTwoShare) - splitAmount) < 0.01
})

// Only surface the add-up state once there's a complete set to validate —
// otherwise an empty/half-filled form would flash orange.
const showSumState = computed(() => {
  const { splitAmount, userOneShare, userTwoShare } = form.value
  return splitAmount != null && userOneShare != null && userTwoShare != null
})

// Green border when shares add up, orange when they don't; no border otherwise.
const sumBorderClass = computed(() => {
  if (!showSumState.value) {
    return ''
  }
  return sharesSumOk.value ? 'ring-success' : 'ring-warning'
})

// Can't mark an expense settled without knowing who paid (matches the edit-side
// rule). Disable the checkbox when paid-by is "Unsure", and force-uncheck it if
// the user switches back to Unsure after settling.
const canSettle = computed(() => form.value.paidByUserId !== UNSURE)

watch(canSettle, (allowed) => {
  if (!allowed) {
    form.value.isSettled = false
  }
})

async function handleSubmit () {
  submitError.value = null

  // Combine the Berlin wall-clock date (+ optional time) into a UTC instant.
  const payload = {
    splitAmount: form.value.splitAmount,
    userOneShare: form.value.userOneShare,
    userTwoShare: form.value.userTwoShare,
    paidByUserId: form.value.paidByUserId === UNSURE ? null : form.value.paidByUserId,
    isSettled: form.value.isSettled,
    date: form.value.date
      ? toUtcInstant(form.value.date, form.value.time)
      : null,
  }
  if (form.value.title.trim()) {
    payload.title = form.value.title.trim()
  }
  if (form.value.notes.trim()) {
    payload.notes = form.value.notes.trim()
  }

  try {
    const created = await expensesStore.createExpense(payload)
    emit('created', created)
  }
  catch (err) {
    // Store already logged + cached the error; surface a friendly message.
    submitError.value = err?.data?.message || err?.message || 'Could not create expense.'
  }
}

// Whether the form is valid enough to submit. Exposed so a host (e.g. the
// slideover footer) can drive the submit button's disabled state.
const canSubmit = computed(() =>
  form.value.splitAmount != null
  && form.value.splitAmount >= 0
  && !!form.value.date
  && sharesSumOk.value,
)

// Expose STATE only. The host triggers submission via a native
// <button type="submit" :form="formId">, not by calling a method here.
defineExpose({ saving, canSubmit })
</script>

<template>
  <div>
    <form :id="formId" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <!-- Title -->
      <div class="flex flex-col gap-1">
        <label for="expense-title" class="text-sm font-semibold">Title</label>
        <UInput
          id="expense-title"
          v-model="form.title"
          placeholder="e.g. Groceries"
          autofocus
        />
      </div>

      <!-- Date / Time -->
      <div class="flex gap-3">
        <div class="flex flex-col gap-1">
          <label for="expense-date" class="text-sm font-semibold">Date</label>
          <UInputDate
            id="expense-date"
            v-model="form.date"
          >
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
          <label for="expense-time" class="text-sm font-semibold">
            Time <span class="text-dimmed font-normal">(optional)</span>
          </label>
          <UInputTime
            id="expense-time"
            v-model="form.time"
          />
        </div>
      </div>

      <USeparator type="dashed" class="mt-3 mb-2" />

      <h2 class="text-sm font-semibold">
        Split Amounts
      </h2>
      <!-- Split Amount -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <label for="expense-amount" class="text-sm">Total (EUR)</label>
          <span
            v-if="showSumState"
            class="text-xs font-medium"
            :class="sharesSumOk ? 'text-success' : 'text-warning'"
          >
            {{ sharesSumOk ? 'Shares add up' : 'Shares do not add up' }}
          </span>
        </div>
        <UInput
          id="expense-amount"
          v-model.number="form.splitAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          required
          :ui="{ base: sumBorderClass }"
        />
        <p class="text-xs text-dimmed">
          Defaults to a 50/50 split — edit a share below to split unevenly.
        </p>
      </div>

      <!-- Shares -->
      <div class="grid grid-cols-2 gap-3">
        <!-- User 1 Share -->
        <div class="flex flex-col gap-1">
          <label for="expense-user-one-share" class="text-sm">
            {{ user1Name }}'s Share
          </label>
          <UInput
            id="expense-user-one-share"
            :model-value="form.userOneShare"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            :ui="{ base: sumBorderClass }"
            @update:model-value="onShareInput('one', $event)"
          />
        </div>

        <!-- User 2 Share -->
        <div class="flex flex-col gap-1">
          <label for="expense-user-two-share" class="text-sm">
            {{ user2Name }}'s Share
          </label>
          <UInput
            id="expense-user-two-share"
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
        <UButton
          color="neutral"
          variant="subtle"
          @click="splitEvenly"
        >
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
        <label for="expense-notes" class="text-sm font-semibold">Notes (optional)</label>
        <UTextarea
          id="expense-notes"
          v-model="form.notes"
          :rows="3"
        />
      </div>

      <p v-if="submitError" class="text-sm text-error">
        {{ submitError }}
      </p>
      <!-- Submit/Cancel live in the host's footer, bound via :form="formId".
           Enter-to-submit still works natively from any field in the form. -->
    </form>
  </div>
</template>
