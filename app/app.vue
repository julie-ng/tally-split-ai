<script setup>
import { useRealtimeStore } from '~/stores/realtime.store'

useHead({
  title: 'Receipts AI POC',
})

const realtimeStore = useRealtimeStore()

onMounted(() => {
  realtimeStore.connect()
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
