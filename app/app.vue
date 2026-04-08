<script setup>
import { useRealtimeStore } from '~/stores/realtime.store'

useHead({
  title: 'Receipts AI POC',
})

if (import.meta.client) {
  const realtimeStore = useRealtimeStore()
  realtimeStore.connect()
}
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
