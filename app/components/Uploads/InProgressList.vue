<script setup>
import { useUploadsStore } from '~/stores/uploads.store'
const uploadsStore = useUploadsStore()

// Combine in-progress and failed uploads
const activeUploads = computed(() => [
  ...uploadsStore.inProgress,
  ...uploadsStore.failed
])
</script>

<template>
<div>
  <section>
    <UploadsInProgressItem
      v-for="item in activeUploads"
      :key="`active-${item.hashId}`"
      :hashId="item.hashId"
    />
  </section>
</div>
</template>
