<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Login',
})

const route = useRoute()

const errorMessages: Record<string, string> = {
  github_oauth_error: 'GitHub authentication failed. Please try again.',
  server_error: 'Something went wrong on our end. Please try again in a moment.',
}

// route.query.error is string | string[] | undefined — coerce to a lookup key.
const errorMessage = computed(() => {
  const key = Array.isArray(route.query.error) ? route.query.error[0] : route.query.error
  return key ? errorMessages[key] ?? null : null
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="flex flex-col gap-4 max-w-sm w-full">
      <UPageCard class="w-full max-w-md">
        <UAuthForm
          title="Tally Split AI"
          description="Login to use Tally Split"
          icon="i-lucide-user"
        />

        <UButton
          to="/api/auth/github"
          icon="i-simple-icons-github"
          label="Login with GitHub"
          color="success"
          size="md"
          external
          block
          class="py-3"
        />
        <UAlert
          v-if="errorMessage"
          title="Login failed"
          :description="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
        />
      </UPageCard>
    </div>
  </div>
</template>
