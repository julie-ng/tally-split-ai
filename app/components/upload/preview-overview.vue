<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: { type: String, required: true },
})

const uploadsStore = useUploadsStore()
const upload = computed(() => uploadsStore.getUploadByHashId(props.hashId))
</script>

<template>
  <div v-if="upload">
    <ui-file-property label="Hash ID" :text="upload.hashId" />
    <ui-file-property label="Original Filename" :text="upload.originalFilename" />
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
