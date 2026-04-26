<script setup>
const { loggedIn, user, session, clear } = useUserSession()

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
      <UButton
        variant="solid"
        color="primary"
        class="cursor-pointer"
        @click="clear"
      >
        Logout
      </UButton>
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
