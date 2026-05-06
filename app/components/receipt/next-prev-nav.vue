<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const props = defineProps({
  receiptId: {
    type: String,
    required: true,
  },
})

const receiptsStore = useReceiptsStore()

const adjacentIds = computed(() => receiptsStore.getAdjacentReceiptIds(props.receiptId))
const prevReceipt = computed(() => adjacentIds.value.prevId ? receiptsStore.getReceiptById(adjacentIds.value.prevId) : null)
const nextReceipt = computed(() => adjacentIds.value.nextId ? receiptsStore.getReceiptById(adjacentIds.value.nextId) : null)

function receipTitle (receipt) {
  if (!receipt) return ''
  return receipt.title || `Receipt ${receipt.id}`
}

function receiptDate (receipt) {
  return receipt.date ? timestampUtils.toGermanISODate(receipt.date) : null
}
</script>

<template>
  <div class="flex justify-between items-center py-2 px-4">
    <NuxtLink
      v-if="adjacentIds.prevId"
      :to="`/receipts/${adjacentIds.prevId}`"
      class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
    >
      <UIcon name="i-lucide-chevron-left" />
      <div class="text-right">
        <div class="text-xs text-slate-400">
          Previous
        </div>
        <div>
          <span class="text-slate-400">({{ receiptDate(prevReceipt) }})</span>
          {{ receipTitle(prevReceipt) }}
        </div>
      </div>
    </NuxtLink>
    <span v-else />
    <NuxtLink
      v-if="adjacentIds.nextId"
      :to="`/receipts/${adjacentIds.nextId}`"
      class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
    >
      <div class="text-left">
        <div class="text-xs text-slate-400">
          Next
        </div>
        <div>
          {{ receipTitle(nextReceipt) }}
          <span class="text-slate-400">({{ receiptDate(nextReceipt) }})</span>
        </div>
      </div>
      <UIcon name="i-lucide-chevron-right" />
    </NuxtLink>
    <span v-else />
  </div>
</template>
