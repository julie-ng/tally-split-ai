<script setup>
defineProps({
  containerClass: {
    type: String,
    required: false,
    default: 'max-w-5xl',
  },
})
</script>

<template>
  <UPage>
    <HomepageNav />
    <!-- <HomepageHero /> -->
    <UContainer :class="containerClass">
      <slot />
      <HomepageFooter />
    </UContainer>
  </UPage>
</template>
