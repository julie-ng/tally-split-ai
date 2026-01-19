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
        :hash-id="item.hashId"
      />
    </section>
  </div>
</template>
