<script setup>
import { useRealtimeStore } from '~/stores/realtime.store'

const { loggedIn, user } = useUserSession()
const realtimeStore = useRealtimeStore()

useHead({
  title: 'Homepage',
})
</script>

<template>
  <UContainer class="my-5 content">
    <h1 class="font-bold text-3xl">
      Homepage
    </h1>

    <div v-if="loggedIn">
      <h1 class="my-4">
        Welcome {{ user.displayName }}!
      </h1>
      <p>Last login: {{ dateUtils.formatDate(new Date(user.lastLoginAt)) }}</p>
      <NuxtLink to="/logout" external @click="realtimeStore.disconnect()">
        <UButton variant="solid" color="primary" class="cursor-pointer">
          Logout
        </UButton>
      </NuxtLink>
    </div>
    <div v-else>
      <h1 class="my-4">
        Not logged in
      </h1>
      <NuxtLink to="/login">
        <UButton variant="solid" color="primary" class="cursor-pointer">
          Login
        </UButton>
      </NuxtLink>
    </div>
  </UContainer>
</template>
