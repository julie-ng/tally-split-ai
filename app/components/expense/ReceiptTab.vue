<script setup>
import { useExpensesStore } from '~/stores/expenses.store'
import { useReceiptsStore } from '~/stores/receipts.store'
import { RECEIPT_ANALYSIS_STATUS } from '#shared/enums/receipt-analysis-status.js'

// Receipt tab of the expense preview. Shows the source receipt's key fields plus
// its upload image. Ownership:
//   - receipts store owns the receipt + its uploads (warmed on preview open)
//   - blob-image fetches the SAS read-URL itself, lazily — so the image only
//     loads when this tab is actually rendered (UTabs mounts active slot only).
// No polygons here on purpose: the polygon overlay needs the line-items table,
// which belongs on the full receipt detail page, not this compact preview.
const props = defineProps({
  expenseId: {
    type: String,
    required: true,
  },
})

const expensesStore = useExpensesStore()
const receiptsStore = useReceiptsStore()

const expense = computed(() => expensesStore.getExpenseById(props.expenseId))
const receiptId = computed(() => expense.value?.receiptId)

const receipt = computed(() => receiptId.value
  ? receiptsStore.getReceiptById(receiptId.value)
  : null,
)

// Receipt warming is kicked off by useExpensePreview on open; still pending if
// it's linked but not yet in the store.
const receiptPending = computed(() => !!receiptId.value && !receipt.value)

const isAnalyzed = computed(() =>
  receipt.value?.analysisStatus === RECEIPT_ANALYSIS_STATUS.ANALYZED,
)

// First upload's blob is the receipt image.
const upload = computed(() => receipt.value?.uploads?.[0])
const blobName = computed(() => upload.value?.blobName)

const altText = computed(() => {
  const r = receipt.value
  if (!r) {
    return 'Receipt image'
  }
  return r.merchantName ? `${r.merchantName} receipt` : 'Receipt image'
})

function amount (value) {
  return receiptUtils.formatAmount(value)
}
</script>

<template>
  <div class="py-4">
    <!-- No receipt linked to this expense -->
    <div v-if="!receiptId" class="text-sm text-muted py-6 text-center">
      No receipt attached to this expense.
    </div>

    <!-- Receipt still warming -->
    <div v-else-if="receiptPending" class="space-y-3">
      <USkeleton class="h-5 w-1/2" />
      <USkeleton class="h-4 w-2/3" />
      <USkeleton class="h-4 w-1/3" />
      <USkeleton class="w-3/4 mx-auto aspect-3/4 rounded-lg" />
    </div>

    <!-- Receipt loaded -->
    <div v-else-if="receipt" class="space-y-5">
      <!-- Title + analysis status -->
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-semibold truncate">
          {{ receipt.title || 'Receipt' }}
        </h3>
        <UBadge
          :label="isAnalyzed ? 'Analyzed' : 'Unanalyzed'"
          :color="isAnalyzed ? 'info' : 'neutral'"
          variant="subtle"
          size="sm"
          class="shrink-0"
        />
      </div>

      <!-- Merchant -->
      <receipt-merchant-info
        v-if="receipt.merchantName"
        :name="receipt.merchantName"
        :address="receipt.merchantAddress"
        :relaxed-line-height="true"
      />
      <p v-else class="text-sm text-dimmed">
        No merchant info detected.
      </p>

      <USeparator />

      <!-- Date / time -->
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted">
            Date
          </dt>
          <dd>{{ receipt.date || '—' }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">
            Time
          </dt>
          <dd>{{ receipt.time || '—' }}</dd>
        </div>
      </dl>

      <USeparator />

      <!-- Totals -->
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted">
            Subtotal
          </dt>
          <dd>{{ amount(receipt.subtotal) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">
            Tax
          </dt>
          <dd>{{ amount(receipt.tax) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">
            Tip
          </dt>
          <dd>{{ amount(receipt.tip) }}</dd>
        </div>
        <div class="flex justify-between font-medium">
          <dt>Total</dt>
          <dd>{{ amount(receipt.total) }}</dd>
        </div>
      </dl>

      <USeparator />

      <!-- Link to full detail page -->
      <div>
        <UButton
          :to="`/receipts/${receiptId}`"
          trailing-icon="i-lucide-receipt-euro"
          color="neutral"
          variant="outline"
        >
          Receipt Details
        </UButton>
      </div>

      <!-- Image preview (last) — blob-image lazily fetches its own SAS URL -->
      <div>
        <p class="text-sm text-muted mb-2 text-center">
          Preview
        </p>
        <UAlert
          v-if="!blobName"
          color="warning"
          variant="subtle"
          icon="i-lucide-image-off"
          title="No receipt image"
          description="This receipt has no uploaded image to display."
        />
        <NuxtLink
          v-else
          :to="`/receipts/${receiptId}`"
          class="block w-3/4 mx-auto rounded-lg overflow-hidden ring-1 ring-default hover:ring-primary transition"
        >
          <blob-image :blob-name="blobName" :alt="altText" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
