<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'
import { useSplitsStore } from '~/stores/splits.store'

const props = defineProps({
  splitId: {
    type: Number,
    required: true,
  },
})

const splitsStore = useSplitsStore()
const receiptsStore = useReceiptsStore()

const split = computed(() => splitsStore.getSplitById(props.splitId))
const receiptId = computed(() => split.value?.receiptId ?? split.value?.receipt?.id ?? null)
const receipt = computed(() => receiptId.value ? receiptsStore.getReceiptById(receiptId.value) : null)

watchEffect(() => {
  if (receiptId.value) receiptsStore.fetchReceiptById(receiptId.value)
})

const uploadHashId = computed(() => receipt.value?.uploads?.[0]?.hashId)

const formattedDate = computed(() => {
  return receipt.value?.date
    ? dateUtils.formatISODate(receipt.value.date)
    : null
})

// Provide highlight state for cross-highlighting between image overlay and items
const { highlightedLabel } = useHighlightedLabel()
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <div v-if="receipt" class="grid grid-cols-2 gap-6">
    <!-- Left column: Receipt info -->
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

      <!-- Split Costs (includes LLM analysis) -->
      <div>
        <p class="text-sm text-muted mb-2">
          Split Costs
        </p>
        <receipt-split :receipt-id="receipt.id" />
      </div>

      <USeparator />

      <!-- Notes -->
      <receipt-notes :receipt="receipt" />

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

    <!-- Right column: Receipt image with overlay -->
    <div class="max-w-xs">
      <receipt-upload-column
        v-if="uploadHashId"
        :hash-id="uploadHashId"
      />
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
