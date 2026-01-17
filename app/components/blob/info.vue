<script setup>
defineProps({
  upload: Object,
})
</script>

<template>
  <div>
    <!-- Original Filename -->
    <ui-file-property label="Original Filename" :ui="{ class: 'my-4' }">
      <p class="text-sm mt-1">
        {{ upload.originalFilename }}
      </p>
    </ui-file-property>

    <!-- Azure Blob Name -->
    <ui-file-property label="Blob Name" :ui="{ class: 'my-4' }">
      <blob-sas-link
        :blobName="upload.blobName"
        :blobUrl="upload.blobUrl"
        :ui="{ class: 'hover:underline hover:text-blue-600 text-sm' }"
      />
    </ui-file-property>

    <!-- File Size -->
    <ui-file-property label="File Size" :ui="{ class: 'my-4' }">
      <p class="text-sm">
        {{ formatBytes(upload.size) }}
      </p>
    </ui-file-property>

    <!-- Azure Blob Tags -->
    <ui-file-property label="Azure Blob Tags" :ui="{ class: 'my-4' }">
      <div class="my-2">
        <blob-tags :tags="upload.azureTags" />
      </div>
    </ui-file-property>
  </div>
</template>
