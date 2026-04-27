<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Account not authorized',
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="flex flex-col gap-4 max-w-sm w-full">
      <UPageCard class="w-full max-w-md">
        <div class="flex flex-col gap-4">
          <UAlert
            title="Account not authorized"
            description="Your GitHub account is not registered for this app. Contact the household admin to be added."
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
          />
          <UButton
            to="/login"
            label="Back to login"
            variant="ghost"
            block
          />
        </div>
      </UPageCard>
    </div>
  </div>
</template>
