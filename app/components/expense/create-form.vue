<script setup>
import { today, getLocalTimeZone } from '@internationalized/date'
import { useExpensesStore } from '~/stores/expenses.store'
import { toUtcInstant } from '#shared/utils/expense-date.utils.js'

const emit = defineEmits(['created', 'cancel'])

const expensesStore = useExpensesStore()

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
  notes: '',
})

const submitError = ref(null)

const saving = computed(() => expensesStore.saving.create || false)

async function handleSubmit () {
  submitError.value = null

  // Combine the Berlin wall-clock date (+ optional time) into a UTC instant.
  const payload = {
    splitAmount: form.value.splitAmount,
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
</script>

<template>
  <div>
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-1">
        <label for="expense-title" class="text-sm font-medium">Title</label>
        <UInput
          id="expense-title"
          v-model="form.title"
          placeholder="e.g. Groceries"
          autofocus
        />
      </div>

      <div class="flex gap-3">
        <div class="flex flex-col gap-1">
          <label for="expense-date" class="text-sm font-medium">Date</label>
          <UInputDate
            id="expense-date"
            v-model="form.date"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="expense-time" class="text-sm font-medium">
            Time <span class="text-dimmed font-normal">(optional)</span>
          </label>
          <UInputTime
            id="expense-time"
            v-model="form.time"
          />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label for="expense-amount" class="text-sm font-medium">Amount to split (EUR)</label>
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
          Split 50/50 between household members. You can adjust shares after.
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label for="expense-notes" class="text-sm font-medium">Notes (optional)</label>
        <UTextarea
          id="expense-notes"
          v-model="form.notes"
          :rows="2"
        />
      </div>

      <p v-if="submitError" class="text-sm text-error">
        {{ submitError }}
      </p>

      <div class="flex items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          color="primary"
          :loading="saving"
          :disabled="form.splitAmount == null || form.splitAmount < 0 || !form.date"
        >
          Create expense
        </UButton>
      </div>
    </form>
  </div>
</template>
