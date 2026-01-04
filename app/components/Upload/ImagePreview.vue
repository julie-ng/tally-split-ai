<script setup>
const props = defineProps({
  blobName: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    required: false,
    default: ''
  }
})

// Fetch SAS token for the blob
const { data: tokenData, pending, error } = await useFetch('/api/tokens/read', {
  method: 'POST',
  body: {
    action: 'read',
    blobName: props.blobName
  }
})

const imageUrl = computed(() => tokenData.value?.blobUrlWithSas || '')
</script>

<template>
<div>
  <!-- Loading state -->
  <LoadingPlaceholder v-if="pending" title="Loading Image" />

  <!-- Error state -->
  <UAlert v-else-if="error"
    title="Unable to Load Image" :description="error.message"
    class="my-5" color="error" variant="subtle" icon="i-lucide-triangle-alert"
  />

  <!-- Image -->
  <img
    v-else-if="imageUrl"
    :src="imageUrl"
    :alt="blobName"
    :data-blob-name="tokenData.blobName"
    :data-sas-expiry="tokenData.expiresAt"
    class="w-full h-auto rounded-lg"
  />
</div>
</template>
