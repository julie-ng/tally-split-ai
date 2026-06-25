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
  notes: '',
})

const submitError = ref(null)

const saving = computed(() => expensesStore.saving.create || false)

// Shares auto-fill to a 50/50 split of the amount until the user edits one.
// Once touched, they hold (the user is setting an asymmetric split by hand).
const sharesTouched = ref(false)

watch(() => form.value.splitAmount, (amount) => {
  if (sharesTouched.value || amount == null) {
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

async function handleSubmit () {
  submitError.value = null

  // Combine the Berlin wall-clock date (+ optional time) into a UTC instant.
  const payload = {
    splitAmount: form.value.splitAmount,
    userOneShare: form.value.userOneShare,
    userTwoShare: form.value.userTwoShare,
    paidByUserId: form.value.paidByUserId === UNSURE ? null : form.value.paidByUserId,
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
      <div class="flex flex-col gap-1">
        <label for="expense-title" class="text-sm font-semibold">Title</label>
        <UInput
          id="expense-title"
          v-model="form.title"
          placeholder="e.g. Groceries"
          autofocus
        />
      </div>

      <div class="flex gap-3">
        <div class="flex flex-col gap-1">
          <label for="expense-date" class="text-sm font-semibold">Date</label>
          <UInputDate
            id="expense-date"
            v-model="form.date"
          >
            <template #trailing>
              <!-- Calendar dropdown. UPopover anchors to its own default
                   trigger (the button below) — no :reference needed. -->
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

      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <label for="expense-amount" class="text-sm font-semibold">Amount to split (EUR)</label>
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            @click="splitEvenly"
          >
            Split evenly
          </UButton>
        </div>
        <UInput
          id="expense-amount"
          v-model.number="form.splitAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          required
        />
        <p class="text-xs text-dimmed">
          Defaults to a 50/50 split — edit a share below to split unevenly.
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label for="expense-user-one-share" class="text-sm font-semibold">
          {{ user1Name }}'s Share
        </label>
        <UInput
          id="expense-user-one-share"
          :model-value="form.userOneShare"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          @update:model-value="onShareInput('one', $event)"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="expense-user-two-share" class="text-sm font-semibold">
          {{ user2Name }}'s Share
        </label>
        <UInput
          id="expense-user-two-share"
          :model-value="form.userTwoShare"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          @update:model-value="onShareInput('two', $event)"
        />
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-sm font-semibold">Paid By</span>
        <URadioGroup
          v-model="form.paidByUserId"
          :items="paidByItems"
          indicator="end"
          variant="card"
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
