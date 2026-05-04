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
    <ui-label-content label="Original Filename" :ui="{ class: 'my-4' }">
      <p class="text-sm mt-1">
        {{ upload.originalFilename }}
      </p>
    </ui-label-content>

    <!-- Azure Blob Name -->
    <ui-label-content label="Blob Name" :ui="{ class: 'my-4' }">
      <blob-sas-link
        :blob-name="upload.blobName"
        :blob-url="upload.blobUrl"
        :ui="{ class: 'hover:underline hover:text-blue-600 text-sm' }"
      />
    </ui-label-content>

    <!-- File Size -->
    <ui-label-content label="File Size" :ui="{ class: 'my-4' }">
      <p class="text-sm">
        {{ formatBytes(upload.size) }}
      </p>
    </ui-label-content>

    <!-- Azure Blob Tags -->
    <ui-label-content label="Azure Blob Tags" :ui="{ class: 'my-4' }">
      <div class="my-2">
        <blob-tags :tags="upload.azureTags" />
      </div>
    </ui-label-content>
  </div>
</template>
