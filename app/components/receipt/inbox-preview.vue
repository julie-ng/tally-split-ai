<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const props = defineProps({
  receipt: {
    type: Object,
    required: true,
  },
})

const receiptsStore = useReceiptsStore()

const upload = computed(() => props.receipt.uploads?.[0])
const uploadHashId = computed(() => receiptsStore.getUploadHashId(props.receipt.id))

const formattedDate = computed(() => {
  return props.receipt.date
    ? dateUtils.formatISODate(props.receipt.date)
    : null
})

// Provide highlight state for cross-highlighting between image overlay and items
const { highlightedLabel } = useHighlightedLabel()
provide('highlightedLabel', highlightedLabel)
</script>

<template>
  <div class="grid grid-cols-2 gap-6">
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

      <!-- Split Costs -->
      <div>
        <p class="text-sm text-muted mb-2">
          Split Costs
        </p>
        <receipt-split
          v-if="receipt.splitId"
          :split-id="receipt.splitId"
        />
        <p v-else class="text-sm text-dimmed">
          No split assigned
        </p>
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
        v-if="upload"
        :upload="upload"
        :upload-hash-id="uploadHashId"
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
