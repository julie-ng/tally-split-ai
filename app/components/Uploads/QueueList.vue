<script setup>
import { useUploadQueueStore } from '~/stores/uploads.store'

const queueStore = useUploadQueueStore()
// const queuedUploads = queueStore.queued
</script>
<template>
  <section class="my-3">
    <div v-if="queueStore.hasItems">
      <UButton
        color="neutral"
        variant="subtle"
        active-variant="solid"
        class="cursor-pointer"
        icon="i-lucide-brush-cleaning"
        @click="queueStore.emptyQueue()"
      >
        Empty Queue
      </UButton>
    </div>
    <UploadsQueueItem v-for="queued in queueStore.queued"
      :key="`queued-${queued.hashId}`"
      :hashId="queued.hashId"
      :name="queued.file.name"
      :size="queued.file.size"
      :type="queued.file.type"
      :lastModified="queued.file.lastModified">
    </UploadsQueueItem>
  </section>
</template>
