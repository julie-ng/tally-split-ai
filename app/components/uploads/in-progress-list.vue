<script setup>
import { useUploadQueueStore } from '~/stores/upload-queue.store'

const uploadsStore = useUploadQueueStore()

// Combine in-progress and failed uploads
const activeUploads = computed(() => [
  ...uploadsStore.inProgress,
  ...uploadsStore.failed,
])
</script>

<template>
  <div>
    <section>
      <uploads-in-progress-item
        v-for="item in activeUploads"
        :key="`active-${item.hashId}`"
        :hash-id="item.hashId"
      />
    </section>
  </div>
</template>
