<script setup>
import { useUploadsStore } from '~/stores/uploads.store'

const uploadsStore = useUploadsStore()
</script>

<template>
  <section class="my-3">
    <div v-if="uploadsStore.hasItems">
      <UButton
        color="neutral"
        variant="subtle"
        active-variant="solid"
        class="cursor-pointer"
        icon="i-lucide-brush-cleaning"
        @click="uploadsStore.emptyQueue()"
      >
        Empty Queue
      </UButton>
    </div>
    <UploadsQueueItem
      v-for="upload in uploadsStore.queued"
      :key="`queued-${upload.hashId}`"
      :hashId="upload.hashId"
    />
  </section>
</template>
