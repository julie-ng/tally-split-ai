<script setup>
const props = defineProps({
  summary: {
    type: Object,
    required: true
  }
})
</script>


<template>
<div>

  Purchased {{ dateUtils.formatISODate(summary.receipt.transactionDate.value) }}, {{ dateUtils.timeWithoutSeconds(summary.receipt.transactionTime.value) }}
  <!-- {{ props.summary }} -->
<ReceiptMerchantInfo :merchant="summary.merchant" />

Subtotal
Tax
Total

 <div class="grid grid-cols-2 gap-3">
  <div>Merchant</div>
  <div>{{ summary.merchant.name.value }}</div>
</div>
</div>
</template>
