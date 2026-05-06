<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const route = useRoute()
const id = route.params.id

const receiptsStore = useReceiptsStore()
receiptsStore.debug = true

await useAsyncData(`receipt-${id}`, () => receiptsStore.fetchReceiptById(id))

// Get reactive refs from store
const receipt = computed(() => receiptsStore.getReceiptById(id))
const pending = computed(() => receiptsStore.isReceiptLoading(id))
const error = computed(() => receiptsStore.getReceiptError(id))

// Set page title reactively after receipt is fetched
useHead({
  title: () => {
    if (receipt.value?.title) {
      return `${receipt.value.title} | Receipt ${id}`
    }
    else {
      return `Receipt ${id}`
    }
  },
})

const breadcrumbItems = computed(() => [
  {
    label: 'Receipts',
    to: '/receipts',
  },
  {
    label: receipt.value?.title ?? `Receipt ${id}`,
    to: `/receipts/${id}`,
  },
])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="receipt?.title ?? `Receipt ${id}`">
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <loading-placeholder v-if="pending" :id="id" title="Loading Receipt" />

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
      <div v-else-if="receipt">
        <receipt-detail :receipt="receipt" />
      </div>

      <!-- Not found state -->
      <div v-else>
        <not-found :id="id" :title="`Receipt Not Found`" />
      </div>

      <!-- Prev/Next Navigation -->
      <receipt-next-prev-nav :receipt-id="id" class="mt-5 border-t border-default pt-4" />
    </template>
  </UDashboardPanel>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
