<script setup>
useHead({
  title: 'TallySplit AI',
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4">
    <h1 class="text-2xl font-bold">
      Tally Split AI
    </h1>
    <p class="block">
      <UButton variant="solid" to="/login">
        Login
      </UButton>
    </p>
  </div>
</template>
