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
  <div class="border border-slate-200">
    <azure-blob-sas-link
      v-if="hasBlobImage"
      :blobName="upload.blobName"
      :blobUrl="upload.blobUrl"
    >
      <azure-blob-image
        :blobName="props.upload.blobName"
        :alt="altText"
      />
    </azure-blob-sas-link>
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
