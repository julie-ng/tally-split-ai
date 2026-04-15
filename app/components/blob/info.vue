<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  hashId: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
uploadsStore.refreshUploadByHashId(props.hashId)

const upload = computed(() => uploadsStore.getUploadByHashId(props.hashId))
</script>

<template>
  <div v-if="upload?.blobName">
    <!-- Original Filename -->
    <ui-file-property label="Original Filename" :ui="{ class: 'my-4' }">
      <p class="text-sm mt-1">
        {{ upload.originalFilename }}
      </p>
    </ui-file-property>

    <!-- Azure Blob Name -->
    <ui-file-property label="Blob Name" :ui="{ class: 'my-4' }">
      <blob-sas-link
        :blob-name="upload.blobName"
        :blob-url="upload.blobUrl"
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
