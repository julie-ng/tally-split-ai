<script setup>
import { useHouseholdStore } from '~/stores/household.store'
import { useRealtimeStore } from '~/stores/realtime.store'

const householdStore = useHouseholdStore()
const realtimeStore = useRealtimeStore()
const { loggedIn } = useUserSession()

// Fetch household once per navigation. Hydrates on the server so child
// components/pages can read members synchronously.
if (loggedIn.value) {
  await useAsyncData('household', () => householdStore.fetch())
}

// Realtime lives at the session level, not per-page: the workflow_runs
// subscription (household-scoped by RLS) stays open across navigation so events
// keep flowing wherever the user is. connect() is client-only (token fetch +
// websocket). Teardown is on logout only (see useLogout) — NOT on unmount.
onMounted(() => {
  if (loggedIn.value) {
    realtimeStore.connect()
  }
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <AppSidebar />

    <slot />
  </UDashboardGroup>
</template>
