<script setup>
const props = defineProps({
  receipt: Object,
})

// Temp - only show 1st upload
const blobFile = computed(() => props.receipt.uploads[0])

const dates = computed(() => {
  return [
    {
      key: 'Receipt Date',
      value: dateUtils.formatISODate(props.receipt.date),
    },
    {
      key: 'Receipt Time',
      value: '(TBD)', // TODO: requires migration
    },
  ]
})
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-4">
      <!-- [Column 1] Receipt Info -->
      <div class="px-4 py-2">
        <ui-section-subtitle text="Transaction Details" />

        <!-- Merchant Info -->
        <receipt-merchant-info
          v-if="props.receipt.merchantName"
          :name="props.receipt.merchantName"
          :address="props.receipt.merchantAddress"
          :relaxed-line-height="true"
          class="my-4"
        />

        <USeparator class="my-4" />

        <!-- Receipt Dates -->
        <data-key-value-table :items="dates" />
        <USeparator class="my-4" />

        <!-- Receipt Totals -->
        <data-key-value-table :items="receiptUtils.extractTotalsAsArray(receipt)" currency="EUR" />
      </div>

      <!-- [Column 2]: -->
      <div class="px-4 py-2">
        <!-- Receipt metadata -->
        <ui-section-subtitle text="Receipt" />
        <receipt-metadata-info :receipt="receipt" />

        <USeparator class="my-4" />

        <!-- Blob Info -->
        <ui-section-subtitle text="Azure Blob Info" />
        <blob-info :upload="blobFile" />
      </div>
    </div>

    <div class="px-4">
      <hr class="my-6 border-slate-300">
      <receipt-notes :receipt="props.receipt" />

      <!-- Edit Button -->
      <div class="my-3">
        <NuxtLink :to="`/receipts/${receipt.id}/edit`">
          <UButton
            icon="i-lucide-pencil"
            color="secondary"
            variant="solid"
            class="hover:cursor-pointer"
          >
            Edit Receipt
          </UButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
