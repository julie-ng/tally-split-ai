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
    <!-- <ui-label-content label="Upload ID" :content="upload.id" /> -->

    <!-- Uploaded Date -->
    <ui-label-content label="Uploaded At" :content="dateUtils.formatDate(new Date(upload.createdAt))" />

    <!-- Blob Filename -->
    <ui-label-content label="Original Filename" :content="upload.originalFilename" />

    <!-- Blob SAS Link -->
    <UiLabelContent label="Blob URL">
      <BlobSasLink
        :blob-name="upload.blobName"
        :blob-url="upload.blobUrl"
        :ui="{ class: 'hover:underline' }"
      >
        {{ upload.blobUrl }}
      </BlobSasLink>
    </UiLabelContent>

    <!-- Button -->
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
