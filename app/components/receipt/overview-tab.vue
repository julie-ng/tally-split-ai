<script setup>
const props = defineProps({
  receipt: Object,
})

const uploadId = computed(() => props.receipt.uploads?.[0]?.id)

const dates = computed(() => {
  return [
    {
      key: 'Receipt Date',
      value: dateUtils.formatISODate(props.receipt.date),
    },
  ]
})
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-4">
      <!-- [Column 1]: -->
      <div class="px-4 py-2">
        <section>
          <ui-section-subtitle>
            Transaction Details
          </ui-section-subtitle>

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
        </section>

        <USeparator class="my-4" />

        <!-- Split Costs -->
        <section>
          <ui-section-subtitle>
            Split Costs
          </ui-section-subtitle>
          <receipt-split
            :receipt-id="props.receipt.id"
          />
        </section>
      </div>

      <!-- [Column 2]: -->
      <div class="px-4 py-2">
        <!-- Metadata -->
        <section>
          <ui-section-subtitle>
            Receipt
          </ui-section-subtitle>
          <receipt-metadata-info :receipt="receipt" />
        </section>

        <USeparator class="my-4" />

        <!-- Blob Info -->
        <section>
          <ui-section-subtitle>
            Azure Blob Info
          </ui-section-subtitle>
          <blob-info v-if="uploadId" :id="uploadId" />
        </section>
      </div>
    </div>

    <div class="px-4">
      <hr class="my-6 border-slate-300">

      <!-- Notes -->
      <section>
        <receipt-notes :receipt="props.receipt" />
      </section>

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
