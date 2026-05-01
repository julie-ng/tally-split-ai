<script setup>
import { useReceiptsStore } from '~/stores/receipts.store'

const route = useRoute()
const router = useRouter()
const id = parseInt(route.params.id)
const toast = useToast()

const receiptsStore = useReceiptsStore()

// Use callOnce for SSR + navigation optimization
await callOnce(() => receiptsStore.fetchReceiptById(id), { mode: 'navigation' })

// Get reactive refs from store
const receipt = computed(() => receiptsStore.getReceiptById(id))
const pending = computed(() => receiptsStore.isReceiptLoading(id))
const error = computed(() => receiptsStore.getReceiptError(id))
const saving = computed(() => receiptsStore.isReceiptSaving(id))

useHead({
  title: () => {
    return receipt.value?.title
      ? `Edit #${id} - ${receipt.value?.title}`
      : `Receipt #${id}`
  },
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

const saveError = ref(null)

const handleSave = async (formData) => {
  saveError.value = null

  try {
    await receiptsStore.updateReceipt(id, formData)
    const currentTitle = formData.title || receipt.value.title
    toast.add({
      title: 'Receipt saved',
      description: `Updated ${currentTitle}`,
      icon: 'i-lucide-receipt-euro',
      color: 'success',
      duration: 1500,
    })
    // Navigate to detail page on success
    await router.push(`/receipts/${id}`)
  }
  catch (err) {
    console.error('Failed to save receipt:', err)
    // Error Message: err.message
    // Errors Object (already zod Flattened): err.data.errors
    saveError.value = err
  }
}

const handleCancel = () => {
  router.push(`/receipts/${id}`)
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="receipt ? `Edit ${receipt.title || `Receipt #${id}`}` : 'Edit Receipt'">
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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

      <!-- Edit Form -->
      <div v-else-if="receipt">
        <!-- Save Error Alert -->
        <zod-errors-pretty
          v-if="saveError"
          title="Error saving receipt"
          :errors="saveError.data.errors"
          :message="saveError.message"
        />

        <div class="max-w-3xl">
          <receipt-edit-form
            :receipt="receipt"
            :saving="saving"
            @save="handleSave"
            @cancel="handleCancel"
          />
        </div>
      </div>

      <!-- Not found state -->
      <div v-else>
        <not-found :title="`Receipt Not Found`" :hash-id="id" />
      </div>
    </template>
  </UDashboardPanel>
</template>
