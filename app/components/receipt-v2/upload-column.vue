<script setup>
const props = defineProps({
  upload: Object,
})

const hasBlobImage = computed(() => props.upload.status === 'uploaded')

const altText = computed(() => {
  return (props.upload.title)
    ? `${props.upload.title} (${props.upload.blobName})`
    : props.upload.blobName
})
</script>

<template>
  <div>
    <AzureBlobImage
      v-if="hasBlobImage"
      :blobName="props.upload.blobName"
      :alt="altText"
    />
    <UAlert
      v-else
      color="error"
      variant="subtle"
      title="Broken Upload"
      description="This receipt is missing an upload."
      icon="i-lucide-triangle-alert"
    />
  </div>
</template>
