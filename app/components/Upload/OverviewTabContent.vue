<script setup>
const props = defineProps({
  upload: Object // should inherit valid schema.
})

const azureTags = computed(() => {
  if (!props.upload.azureTags) return []
  const data = JSON.parse(props.upload.azureTags)
  return Object.entries(data).map(([key, value]) => ({ key, value }))
})
</script>

<template>
<div class="pt-6 px-4 flex flex-row">
  <div>
  <h2 class="mb-3 font-semibold text-lg">File Info</h2>
  <UIFileProperty label="Original Filename" :text="upload.originalFilename" />
  <UIFileProperty label="Blob Size" :text="formatBytes(upload.size)" />

  <h2 class="mt-6 mb-3 font-semibold text-lg">Azure Info</h2>
  <UIFileProperty label="Blob Name" :text="upload.blobName" />
  <UIFileProperty label="Blob Url" :text="upload.blobUrl" />
  <ClientOnly>
    <UIFileProperty label="Azure Blob Index Tags">
      <div class="flex flex-wrap gap-2 pt-2">
        <UBadge
          v-for="tag in azureTags"
          :key="tag.key"
          class="text-slate-500"
          color="neutral"
          variant="soft"
        >
          {{ tag.key }}: {{ tag.value }}
        </UBadge>
      </div>
    </UIFileProperty>
  </ClientOnly>
  <h2 class="mt-6 mb-3 font-semibold text-lg">OCR Analysis</h2>
  <UIFileProperty label="Status" :text="upload.analysisStatus" />
  <UIFileProperty v-if="upload.analyzedAt" label="Analyzed At" :text="timestampUtils.toShortDate(upload.analyzedAt)" />
  <UIFileProperty v-if="upload.analyzedAt" label="OCR Result">
    <ClientOnly>
      <pre class="w-fit mt-1 p-5 bg-slate-100 rounded-lg font-mono text-xs">
        {{ upload.analysisOcrResult }}
      </pre>
    </ClientOnly>
  </UIFileProperty>
  </div>
  <div>
    <UploadImagePreview :blobName="upload.blobName" :alt="upload.blobName" />
  </div>

</div>
</template>
