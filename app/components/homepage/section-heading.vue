<script setup>
defineProps({
  heading: {
    type: String,
    required: true,
  },
  subheading: {
    type: String,
    required: false,
  },
})
</script>

<template>
  <div class="space-y-2">
    <h3 v-if="subheading" class="text-xl font-bold">
      {{ subheading }}
    </h3>
    <h1 v-if="heading" class="text-4xl font-bold">
      {{ heading }}
    </h1>
    <p class="text-xl text-muted md:max-w-3xl">
      <slot />
    </p>
  </div>
</template>
