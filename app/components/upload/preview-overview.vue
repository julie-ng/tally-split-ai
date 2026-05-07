<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
const upload = computed(() => uploadsStore.getUploadById(props.id))
</script>

<template>
  <div v-if="upload">
    <ui-label-content label="ID" :content="upload.id" />
    <ui-label-content label="Created At" :content="dateUtils.formatDate(new Date(upload.createdAt))" />
    <ui-label-content label="Original Filename" :content="upload.originalFilename" />
    <UButton
      v-if="upload.receiptId"
      :to="`/receipts/${upload.receiptId}`"
      color="primary"
      size="sm"
      icon="i-lucide-receipt-euro"
    >
      View Receipt
    </UButton>
  </div>
</template>
