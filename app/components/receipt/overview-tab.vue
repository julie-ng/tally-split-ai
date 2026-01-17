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
      value: dateUtils.formatISODate(props.receipt.receiptDate),
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
        <h1 class="my-2 font-semibold">
          Receipt
        </h1>

        <receipt-metadata-info :receipt="receipt" />

        <hr class="my-4 border-slate-300 border-dashed">

        <h1 class="my-2 font-semibold">
          Transaction Details
        </h1>

        <!-- Merchant Info -->
        <receipt-merchant-info
          v-if="props.receipt.merchantName"
          :name="props.receipt.merchantName"
          :address="props.receipt.merchantAddress"
          :relaxed-line-height="true"
          class="my-4"
        />

        <hr class="my-4 border-slate-300 border-dashed">

        <!-- Receipt Dates -->
        <data-key-value-table :items="dates" />
        <hr class="my-4 border-slate-300 border-dashed">

        <!-- Receipt Totals -->
        <data-key-value-table :items="receiptUtils.extractTotalsAsArray(receipt)" currency="EUR" />
      </div>

      <!-- [Column 2]: Azure Blob Info -->
      <div class="px-4 py-2">
        <h1 class="mt-2 mb-4 font-semibold">
          Azure Blob Info
        </h1>
        <blob-info :upload="blobFile" />
      </div>
    </div>

    <div class="px-4">
      <hr class="my-6 border-slate-200">
      <receipt-notes :receipt="props.receipt" />
    </div>
  </div>
</template>
