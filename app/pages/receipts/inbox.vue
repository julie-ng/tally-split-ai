<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

useHead({
  title: 'Receipt Inbox',
})

const receiptsStore = useReceiptsStore()

await callOnce(() => receiptsStore.fetchReceipts(), { mode: 'navigation' })

const { allReceipts: receipts } = storeToRefs(receiptsStore)

const selectedId = ref(null)

const selectedReceipt = computed(() => {
  if (!selectedId.value) return null
  return receiptsStore.getReceiptById(selectedId.value)
})

async function selectReceipt (id) {
  selectedId.value = id
  // Fetch full receipt data (with uploads, split relations)
  await receiptsStore.fetchReceiptById(id)
}

// Auto-select first receipt on load
watch(receipts, (list) => {
  if (list.length > 0 && !selectedId.value) {
    selectReceipt(list[0].id)
  }
}, { immediate: true })
</script>

<template>
  <div class="flex overflow-hidden" style="height: calc(100vh - 1px)">
    <!-- Left: scrollable receipt list -->
    <div class="w-80 shrink-0 border-r border-default overflow-y-auto">
      <receipt-inbox-list-item
        v-for="r in receipts"
        :key="r.id"
        :receipt="r"
        :active="r.id === selectedId"
        @select="selectReceipt(r.id)"
      />
    </div>

    <!-- Right: preview panel -->
    <div class="flex-1 overflow-y-auto p-6">
      <receipt-inbox-preview
        v-if="selectedReceipt"
        :key="selectedId"
        :receipt="selectedReceipt"
      />
      <div v-else class="flex items-center justify-center h-full text-muted">
        Select a receipt to preview
      </div>
    </div>
  </div>
</template>
