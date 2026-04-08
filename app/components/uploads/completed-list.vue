<script setup>
import { useUploadQueueStore } from '~/stores/upload-queue.store'

const uploadsStore = useUploadQueueStore()
</script>

<template>
  <div>
    <section>
      <UButton
        v-if="uploadsStore.hasCompleted"
        color="neutral"
        variant="subtle"
        active-variant="solid"
        class="cursor-pointer"
        icon="i-lucide-brush-cleaning"
        @click="uploadsStore.clearCompleted()"
      >
        Clear Completed
      </UButton>
      <uploads-completed-item
        v-for="item in uploadsStore.completed"
        :key="`completed-${item.hashId}`"
        :hash-id="item.hashId"
      />
    </section>
  </div>
</template>
