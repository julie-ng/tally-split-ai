<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const queueStore = useUploadsStore()
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
    <UploadsQueueItem v-for="upload in queueStore.queued"
      :key="`queued-${upload.hashId}`"
      :hashId="upload.hashId"
      :name="upload.file.name"
      :size="upload.file.size"
      :type="upload.file.type"
      :lastModified="upload.file.lastModified">
    </UploadsQueueItem>
  </section>
</template>
