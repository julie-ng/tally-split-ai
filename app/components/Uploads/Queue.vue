<script setup>
import { useUploadQueueStore } from '~/stores/uploads-queue'

const queueStore = useUploadQueueStore()
const queuedUploads = queueStore.uploads
</script>
<template>
  <section class="my-3">
    <!-- <h1 class="font-bold text-md text-slate-600">Scan View Preview</h1> -->
    <!-- <pre class="my-3 p-3 bg-slate-700 text-slate-300"><code>{{ queuedUploads }}</code></pre> -->
    <div v-if="queueStore.hasItems">
      <UButton
        color="neutral"
        variant="subtle"
        active-variant="solid"
        class="cursor-pointer"
        icon="i-lucide-brush-cleaning"
        @click="queueStore.removeAll()"
      >
        Empty Queue
      </UButton>
    </div>
    <UploadsQueueItem v-for="queued in queuedUploads"
      :key="`queued-${queued.hashId}`"
      :hashId="queued.hashId"
      :name="queued.file.name"
      :size="queued.file.size"
      :type="queued.file.type"
      :lastModified="queued.file.lastModified">
    </UploadsQueueItem>
  </section>
</template>
