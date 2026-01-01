<script setup>
import { useUploadsStore } from '~/stores/uploads.store'
const uploadsStore = useUploadsStore()
</script>

<template>
<div>
  <section>
    <UploadsCompletedItem
      v-for="item in uploadsStore.completed"
      :key="`completed-${item.hashId}`"
      :hashId="item.hashId"
    />
  </section>
</div>
</template>
