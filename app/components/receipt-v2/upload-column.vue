<script setup>
const props = defineProps({
  upload: Object,
})

const altText = computed(() => {
  return (props.upload.title)
    ? `${props.upload.title} (${props.upload.blobName})`
    : props.upload.blobName
})
</script>

<template>
  <div>
    <AzureBlobImage
      :blobName="props.upload.blobName"
      :alt="altText"
    />
  </div>
</template>
