<script setup>
const route = useRoute()
const id = route.params.id

// Fetch receipt details with uploads relation
const { data: receipt, pending, error } = await useFetch(`/api/receipts/${id}`)

// Set page title reactively after receipt is fetched
useHead({
  title: () => `${receipt.value?.merchantName || `Receipt #${id}`} | Receipt`,
})

const breadcrumbItems = [
  {
    label: 'Receipts',
    to: '/receipts',
  }, {
    label: `Receipt #${id}`,
    to: `/receipts/${id}`,
  },
]
</script>

<template>
  <UContainer class="pt-5">
    <UBreadcrumb :items="breadcrumbItems" />

    <!-- Loading -->
    <LoadingPlaceholder v-if="pending" title="Loading Receipt" :hashId="id" />

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
      <ReceiptDetail :receipt="receipt" />
    </div>

    <!-- Not found state -->
    <div v-else>
      <NotFound :title="`Receipt Not Found`" :hashId="id" />
    </div>
  </UContainer>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
}
</style>
