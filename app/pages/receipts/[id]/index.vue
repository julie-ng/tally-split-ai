<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const route = useRoute()
const id = parseInt(route.params.id)

const receiptsStore = useReceiptsStore()

// Use callOnce for SSR + navigation optimization
await callOnce(() => receiptsStore.fetchReceipt(id), { mode: 'navigation' })
// Fetch all receipts for prev/next navigation (cached if already loaded)
await callOnce(() => receiptsStore.fetchReceipts(), { mode: 'navigation' })

// Get reactive refs from store
const receipt = computed(() => receiptsStore.getReceiptById(id))
const pending = computed(() => receiptsStore.isReceiptLoading(id))
const error = computed(() => receiptsStore.getReceiptError(id))
// Set page title reactively after receipt is fetched
useHead({
  title: () => {
    if (receipt.value?.title) {
      return `${receipt.value.title} | Receipt #${id}`
    }
    else {
      return `Receipt #${id}`
    }
  },
})

const breadcrumbItems = [
  {
    label: 'Receipts',
    to: '/receipts',
  }, {
    label: `#${id}`,
    to: `/receipts/${id}`,
  },
]
</script>

<template>
  <NuxtLayout>
    <UContainer class="pt-5">
      <div class="mb-5">
        <UButton
          color="neutral"
          variant="outline"
          class="cursor-pointer"
          @click="receiptsStore.clearAllCaches()"
        >
          Reset Local Storage
        </UButton>
      </div>
      <div class="ml-4">
        <UBreadcrumb :items="breadcrumbItems" />
      </div>

      <!-- Loading -->
      <loading-placeholder v-if="pending" title="Loading Receipt" :hash-id="id" />

      <!-- Error -->
      <UAlert
        v-else-if="error"
        title="Unable to Load Receipt"
        :description="error.message"
        class="my-5"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      />

      <!-- Receipt Details -->
      <div v-else-if="receipt" class="mr-4">
        <receipt-detail :receipt="receipt" />
      </div>

      <!-- Not found state -->
      <div v-else>
        <not-found :title="`Receipt Not Found`" :hash-id="id" />
      </div>
    </UContainer>

    <template #panel-footer>
      <receipt-next-prev-nav :receipt-id="id" />
    </template>
  </NuxtLayout>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
