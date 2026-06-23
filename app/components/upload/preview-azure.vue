<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
})

const uploadsStore = useUploadsStore()
const upload = computed(() => uploadsStore.getUploadById(props.id))
</script>

<template>
  <div v-if="upload">
    <ui-label-content label="Blob Size">
      <div class="text-xs mt-1">
        {{ formatBytes(upload.size) }}
      </div>
    </ui-label-content>
    <ui-label-content label="Blob Name">
      <div class="text-xs mt-1">
        {{ upload.blobName }}
      </div>
    </ui-label-content>
    <ui-label-content label="Blob Url">
      <div class="text-xs mt-1">
        {{ upload.blobUrl }}
      </div>
    </ui-label-content>
  </div>
</template>
