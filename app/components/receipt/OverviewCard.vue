<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

// Receipt overview inside the expense preview's Receipt tab: the receipt's id
// and its money rows. Merchant name and date live in the tab heading, not here.
//
// Self-fetching by id. The receipts store is the single owner of receipt data
// and realtime keeps it current, so a caller only needs to know the id — it
// does not have to warm the store first.
//
// The fetch keys off the id via an IMMEDIATE watch, never a bare setup call:
// this card is reused as the preview panel swaps rows without remounting, so a
// setup-time fetch would run once for the first id and silently never re-fetch.
// See rules/vue-component-conventions.md — the reused-leaf trap.
const props = defineProps({
  receiptId: {
    type: String,
    required: true,
  },
})

const receiptsStore = useReceiptsStore()

watch(() => props.receiptId, (id) => {
  if (!id) {
    return
  }
  // Cache-aware; the store surfaces the failure through getReceiptError.
  receiptsStore.fetchReceiptById(id).catch(() => {})
}, { immediate: true })

const receipt = computed(() => receiptsStore.getReceiptById(props.receiptId))
const error = computed(() => receiptsStore.getReceiptError(props.receiptId))

// Tip only appears when the receipt has one; the grand total is always last and
// flagged `isTotal` so it can carry the emphasis. Empty until the receipt loads.
const totals = computed(() => receiptUtils.extractTotalsAsArray(receipt.value))
</script>

<template>
  <UAlert
    v-if="error"
    color="error"
    variant="subtle"
    icon="i-lucide-triangle-alert"
    title="Unable to load receipt"
    :description="error.message"
  />

  <div
    v-else-if="!receipt"
    class="rounded-lg border border-default bg-default px-4 py-3 space-y-3"
  >
    <USkeleton class="h-5 w-1/2" />
    <USkeleton class="h-4 w-full" />
  </div>
  <UiCollapsibleCard
    v-else
    default-open
  >
    <template #header>
      <span class="text-sm font-medium">
        Receipt
      </span>
    </template>
    <UiDefinitionList class="text-sm text-muted">
      <UiDefinitionTerm
        label="ID"
        label-class="text-dimmed"
        value-class="font-mono text-dimmed"
      >
        {{ receipt.id }}
      </UiDefinitionTerm>

      <!-- <UiDefinitionTerm label="Date">
        {{ dateUtils.formatISODate(receipt.date) }}
        <span v-if="receipt.time">, {{ dateUtils.timeWithoutSeconds(receipt.time) }}</span>
      </UiDefinitionTerm>

      <USeparator class="my-3" /> -->

      <template
        v-for="total in totals"
        :key="total.key"
      >
        <!-- The grand total earns emphasis and a rule above it. -->
        <USeparator v-if="total.isTotal" />

        <UiDefinitionTerm
          :label="total.key"
          :label-class="total.isTotal ? 'font-medium text-default' : ''"
          :value-class="total.isTotal ? 'font-medium text-default tabular-nums' : 'tabular-nums'"
        >
          {{ receiptUtils.formatAmount(total.value) }}
        </UiDefinitionTerm>
      </template>
    </UiDefinitionList>
  </UiCollapsibleCard>
</template>
