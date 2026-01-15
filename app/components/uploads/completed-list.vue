<script setup>
import { useUploadQueueStore } from '~/stores/upload-queue.store'

const uploadsStore = useUploadQueueStore()
</script>

<template>
  <div>
    <section>
      <uploads-completed-item
        v-for="item in uploadsStore.completed"
        :key="`completed-${item.hashId}`"
        :hashId="item.hashId"
      />
    </section>
  </div>
</template>
