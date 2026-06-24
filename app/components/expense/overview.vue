<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'
import { useExpensesStore } from '~/stores/expenses.store'
import { useUploadsStore } from '~/stores/uploads.store'
import { toBerlinDisplayDate } from '#shared/utils/expense-date.utils.js'

const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
const receiptsStore = useReceiptsStore()
const uploadsStore = useUploadsStore()

const expense = computed(() => expensesStore.getExpenseById(props.expenseId))
const receiptId = computed(() => expense.value?.receiptId ?? expense.value?.receipt?.id ?? null)
const receipt = computed(() => receiptId.value ? receiptsStore.getReceiptById(receiptId.value) : null)

watchEffect(() => {
  if (receiptId.value) receiptsStore.fetchReceiptById(receiptId.value)
})

const uploadId = computed(() => receipt.value?.uploads?.[0]?.id)
const upload = computed(() =>
  uploadId.value ? uploadsStore.getUploadById(uploadId.value) : null,
)

// The expense owns its own date (copied from the receipt for linked expenses,
// set by the user for standalone ones), so read it from the expense — not the
// receipt — or a standalone expense would show no date here. The stored value
// is a UTC timestamptz; format it in Berlin time.
const formattedDate = computed(() => {
  return toBerlinDisplayDate(expense.value?.date)
})

// Provide highlight state for cross-highlighting between image overlay and items
const { highlightedLabel } = useHighlightedLabel()
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <div v-if="receipt" class="grid grid-cols-2 gap-6">
    <!-- Left column: Receipt info -->
    <UCard>
      <div>
        <p class="text-sm text-muted">
          <span class="font-mono">{{ receipt.id }}</span>
        </p>
      </div>

      <div class="space-y-5">
        <!-- Title & Merchant -->
        <div>
          <h2 class="text-xl font-bold">
            {{ receipt.title || 'Untitled' }}
          </h2>
          <receipt-merchant-info
            v-if="receipt.merchantName"
            :name="receipt.merchantName"
            :address="receipt.merchantAddress"
            class="mt-1"
          />
        </div>

        <USeparator />

        <!-- Transaction Date -->
        <div>
          <p class="text-sm text-muted">
            Transaction Date
          </p>
          <p class="font-medium">
            {{ formattedDate || '—' }}
          </p>
        </div>

        <USeparator />

        <!-- Totals -->
        <div>
          <p class="text-sm text-muted mb-2">
            Totals
          </p>
          <data-key-value-table :items="receiptUtils.extractTotalsAsArray(receipt)" currency="EUR" />
        </div>

        <USeparator />

        <!-- Expense Costs (includes LLM analysis) -->
        <div>
          <p class="text-sm text-muted mb-2">
            Expense Costs
          </p>
          <receipt-expense :receipt-id="receipt.id" />
        </div>

        <USeparator />

        <!-- Actions -->
        <div class="flex gap-2">
          <UButton
            :to="`/receipts/${receipt.id}`"
            variant="subtle"
            color="neutral"
          >
            Full Details
          </UButton>
          <UButton
            :to="`/receipts/${receipt.id}/edit`"
            variant="subtle"
            color="neutral"
          >
            Edit
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Right column: Receipt image with overlay -->
    <div class="max-w-xs">
      <div v-if="uploadId">
        <receipt-upload-column :id="uploadId" />
        <ui-label-content label="Upload ID">
          <div class="font-mono">
            {{ upload?.id }}
          </div>
        </ui-label-content>
        <ui-label-content label="Uploaded At">
          <div class="text-xs">
            {{ dateUtils.formatDate(new Date(upload?.createdAt)) }}
          </div>
        </ui-label-content>
        <upload-json-links :upload-id="uploadId" />
      </div>
      <UAlert
        v-else
        color="warning"
        variant="subtle"
        title="No Upload"
        description="This receipt has no associated upload."
        icon="i-lucide-image-off"
      />
    </div>
  </div>
</template>
