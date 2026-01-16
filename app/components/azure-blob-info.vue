<script setup>
defineProps({
  upload: Object,
})
</script>

<template>
  <div>
    <!-- Original Filename -->
    <ui-file-property label="Original Filename">
      <p class="text-sm font-mono">
        {{ upload.originalFilename }}
      </p>
    </ui-file-property>

    <!-- File Size -->
    <ui-file-property label="File Size">
      <p class="text-sm font-mono">
        {{ formatBytes(upload.size) }}
      </p>
    </ui-file-property>

    <!-- Azure Blob Name -->
    <ui-file-property label="Blob Name">
      <azure-blob-sas-link
        :blobName="upload.blobName"
        :blobUrl="upload.blobUrl"
        :ui="{ class: 'hover:underline hover:text-blue-600 text-sm' }"
      />
    </ui-file-property>

    <!-- Azure Blob Tags -->
    <ui-file-property label="Azure Blob Tags">
      <div class="my-2">
        <azure-blob-tags :tagsAsString="upload.azureTags" />
      </div>
    </ui-file-property>
  </div>
</template>
