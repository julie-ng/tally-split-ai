<script setup>
const { loggedIn, user } = useUserSession()
const logout = useLogout()

useHead({
  title: 'Homepage',
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Home">
        <template #left>
          <UBreadcrumb :items="[{ label: 'Home' }]" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loggedIn">
        <h1 class="my-4">
          Welcome {{ user.displayName }}!
        </h1>
        <p>Last login: {{ dateUtils.formatDate(new Date(user.lastLoginAt)) }}</p>
        <UButton
          variant="solid"
          color="primary"
          class="cursor-pointer"
          @click="logout"
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
    </template>
  </UDashboardPanel>
</template>
