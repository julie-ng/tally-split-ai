<script setup>
const props = defineProps({
  receipt: Object,
})

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
    <div class="grid grid-cols-3 gap-4">
      <!-- [Column 1] Analysis, Metadata -->
      <div class="px-4 py-2">
        <h1 class="my-2 font-semibold">
          Analysis
        </h1>
        <receipt-analysis-status :receipt="receipt" />
        <hr class="my-4 border-b-slate-100 text-slate-300 border-dashed">
        <receipt-metadata :receipt="receipt" />
      </div>

      <!-- [Column 2] Transaction Details -->
      <div class="px-4 py-2">
        <h1 class="my-2 font-semibold">
          Transaction Details
        </h1>

        <!-- Receipt Dates -->
        <data-key-value-table :items="dates" />
        <hr class="my-4 border-b-slate-100 text-slate-300 border-dashed">

        <!-- Receipt Totals -->
        <data-key-value-table :items="receiptUtils.extractTotalsAsArray(receipt)" currency="EUR" />
      </div>

      <!-- [Column 3]: Merchant Info -->
      <div class="pt-8">
        <!-- Merchant Info -->
        <receipt-merchant-info
          v-if="props.receipt.merchantName"
          :name="props.receipt.merchantName"
          :address="props.receipt.merchantAddress"
          :phone="props.receipt.merchantPhone"
          class="my-4"
        />
      </div>
    </div>

    <div class="px-4">
      <hr class="my-4 border-b-slate-100 text-slate-300">
      <receipt-notes :receipt="props.receipt" />
    </div>
  </div>
</template>
