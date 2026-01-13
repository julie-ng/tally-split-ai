<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const receiptsStore = useReceiptsStore()

// Fetch receipt data
const { data: receipt, pending, error } = await useFetch(`/api/receipts/${id}`)

useHead({
  title: () => `Edit ${receipt.value?.merchantName || `Receipt #${id}`}`,
})

const breadcrumbItems = [
  {
    label: 'Receipts',
    to: '/receipts',
  },
  {
    label: `Receipt #${id}`,
    to: `/receipts/${id}`,
  },
  {
    label: 'Edit',
    to: `/receipts/${id}/edit`,
  },
]

const saving = ref(false)
const saveError = ref(null)

const handleSave = async (formData) => {
  saving.value = true
  saveError.value = null

  try {
    await receiptsStore.updateReceipt(id, formData)
    // Navigate to detail page on success
    await router.push(`/receipts/${id}`)
  }
  catch (err) {
    console.error('Failed to save receipt:', err)
    saveError.value = err
  }
  finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.push(`/receipts/${id}`)
}
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

    <!-- Edit Form -->
    <div v-else-if="receipt" class="my-5">
      <h1 class="font-bold text-3xl mb-5">
        Edit {{ receipt.merchantName || `Receipt #${id}` }}
      </h1>

      <!-- Save Error Alert -->
      <UAlert
        v-if="saveError"
        title="Failed to Save Receipt"
        :description="saveError.message"
        class="mb-5"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      />

      <ReceiptEditForm
        :receipt="receipt"
        :saving="saving"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </div>

    <!-- Not found state -->
    <div v-else>
      <NotFound :title="`Receipt Not Found`" :hashId="id" />
    </div>
  </UContainer>
</template>
