<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
uploadsStore.refreshUploadById(props.id)

const upload = computed(() => uploadsStore.getUploadById(props.id))
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
  </div>
</template>
