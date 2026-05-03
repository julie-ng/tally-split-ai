<script setup>
import { useRealtimeStore } from '~/stores/realtime.store'

useHead({
  title: 'Receipts AI POC',
})

const realtimeStore = useRealtimeStore()
const { loggedIn } = useUserSession()

// Only initiate SSE when authenticated, and only on the client (EventSource
// doesn't exist during SSR). Initial connect on mount; watch follows
// login/logout that happens mid-session.
onMounted(() => {
  if (loggedIn.value) realtimeStore.connect()
})

watch(loggedIn, (val) => {
  if (val) realtimeStore.connect()
  else realtimeStore.disconnect()
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
