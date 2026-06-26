<script setup>
import { useHouseholdStore } from '~/stores/household.store'

const householdStore = useHouseholdStore()
const { loggedIn } = useUserSession()

// Fetch household once per navigation. Hydrates on the server so child
// components/pages can read members synchronously.
if (loggedIn.value) {
  await useAsyncData('household', () => householdStore.fetch())
}
</script>

<template>
  <UDashboardGroup>
    <AppSidebar />

    <slot />
  </UDashboardGroup>
</template>
