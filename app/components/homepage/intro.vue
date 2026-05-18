<script setup>
const { data: home } = await useAsyncData(
  'home-intro',
  () => queryCollection('homepage').first(),
)
</script>

<template>
  <section>
    <h1
      v-if="home.tagline"
      class="text-5xl/16 font-bold text-center"
    >
      {{ home.tagline }}
    </h1>
    <h2
      v-if="home.subtagline"
      class="mt-2 text-xl text-center"
    >
      {{ home.subtagline }}
    </h2>

    <p class="text-center mt-8 mb-6">
      <UButton
        color="primary"
        variant="solid"
        icon="i-simple-icons-github"
        aria-label="View source on GitHub"
        size="md"
        class="py-3 px-4"
        to="https://github.com/julie-ng/tally-split-ai"
        target="_blank"
      >
        View Source on GitHub
      </UButton>
    </p>

    <ContentRenderer v-if="home" :value="home" />
    <div v-else>
      Home not found
    </div>
  </section>
</template>
