<script setup>
const props = defineProps({
  upload: Object // should inherit valid schema.
})
</script>

<template>
<div class="pt-6 px-4 grid grid-cols-5 gap-6">
  <div class="col-span-3">
    <UICollapsiblePropertyGroup title="File Info">
      <UIFileProperty label="Original Filename" :text="upload.originalFilename" />
      <UIFileProperty label="Blob Size" :text="formatBytes(upload.size)" />
    </UICollapsiblePropertyGroup>

    <hr class="text-slate-300 my-3">

    <UICollapsiblePropertyGroup title="Azure Info">
      <UIFileProperty label="Blob Name" :text="upload.blobName" />
      <UIFileProperty label="Blob Url" :text="upload.blobUrl" />
      <ClientOnly>
        <UIFileProperty label="Azure Blob Index Tags">
          <div class="flex flex-wrap gap-2 pt-2">
            <UBadge
              v-for="tag in azureUtils.blobTagsJsonToObject(upload.azureTags)"
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
    </UICollapsiblePropertyGroup>

    <hr class="text-slate-300 my-3">

    <UICollapsiblePropertyGroup title="OCR Analysis">
      <UIFileProperty label="Status" :text="upload.analysisStatus" />
      <UIFileProperty v-if="upload.analyzedAt" label="Analyzed At" :text="timestampUtils.toShortDate(upload.analyzedAt)" />
      <UIFileProperty v-if="upload.analyzedAt" label="OCR Result">
        <ClientOnly>
          <pre class="w-fit mt-1 p-5 bg-slate-100 rounded-lg font-mono text-xs">
            {{ upload.analysisOcrResult }}
          </pre>
        </ClientOnly>
      </UIFileProperty>
    </UICollapsiblePropertyGroup>
  </div>
  <div class="col-span-2">
    <AzureBlobImage
      :blobName="upload.blobName"
      :alt="upload.blobName"
    />
  </div>

</div>
</template>
