<script setup>
const props = defineProps({
  fields: Object, // Schema Valided Azure document
  analysisStatus: {
    type: String,
    required: false,
  },
  analyzedAt: {
    type: String,
    required: false,
  },
})

const dates = computed(() => {
  return [
    {
      key: 'Receipt Date',
      value: dateUtils.formatISODate(props.fields.receipt.transactionDate.value),
    },
    {
      key: 'Receipt Time',
      value: dateUtils.timeWithoutSeconds(props.fields.receipt.transactionTime.value),
    },
  ]
})

const totals = [
  {
    key: 'Subtotal',
    value: props.fields.receipt.taxDetails?.value?.[0]?.valueObject?.NetAmount?.valueCurrency?.amount,
  },
  {
    key: 'Tax',
    value: props.fields.receipt.totalTax?.value?.amount || '',
  },
  {
    key: 'Tip',
    value: '-',
  },
  {
    key: 'Total',
    value: props.fields.receipt.total?.value?.amount || '',
  },
]
</script>

<template>
  <div class="grid grid-cols-3 gap-x-20">
    <div>
      <div class="grid grid-cols-2 gap-0">
        <div class="py-1 text-slate-500 text-sm">
          Analyzed At
        </div>
        <div class="py-1.5 text-sm text-right">
          {{ timestampUtils.toShortDate(props.analyzedAt) }}
        </div>
        <div class="py-1.5 text-slate-500 text-sm">
          Analysis Status
        </div>
        <div class="py-1 text-right">
          <UBadge
            :label="props.analysisStatus"
            :color="badgeStyleHelpers.statusBadgeColor(props.analysisStatus)"
            :variant="badgeStyleHelpers.statusBadgeVariant(props.analysisStatus)"
            class="capitalize"
          />
        </div>
      </div>
      <hr class="my-3 border-slate-200">
      <DataKeyValueTable :items="totals" currency="€" />
      <hr class="my-3 border-slate-200">
    </div>
    <div>
      <DataKeyValueTable :items="dates" />
      <hr class="my-3 border-slate-200">

      <p class="text-sm text-slate-500 mb-1">
        Merchant
      </p>
      <ReceiptMerchantInfo :merchant="fields.merchant" class="mb-4" />

      <!-- <p class="text-sm text-slate-500 mb-1">Receipt Date</p>
      <p class="mb-4">{{ fields.receipt.transactionDate.value }}</p>
      <p class="text-sm text-slate-500 mb-1">Receipt Time</p>
      <p class="mb-4">{{ fields.receipt.transactionTime.value }}</p> -->
    </div>
    <div>
      Image Placeholder
    </div>
  </div>
</template>
