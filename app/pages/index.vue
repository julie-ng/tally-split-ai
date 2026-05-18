<script setup>
const { data: home } = await useAsyncData(
  'home-seo',
  () => {
    return queryCollection('homepage')
      .select('title', 'description')
      .first()
  },
)

useHead({
  title: 'TallySplit AI',
})

useSeoMeta({
  title: home.value?.title,
  description: home.value?.description,
})

definePageMeta({
  layout: 'homepage',
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 pt-12">
    <!-- Intro -->
    <HomepageIntro />
    <USeparator class="my-12" />

    <!-- Architecture -->
    <HomepageArchitecture />
    <USeparator class="my-12" />

    <!-- LLM Pipeline -->
    <HomepagePipeline />
    <USeparator class="my-12" />

    <!-- Auth N -->
    <HomepageSecurityAuthentication />
    <USeparator class="my-12" />

    <!-- Auth Z -->
    <HomepageSecurityAuthorization />
    <USeparator class="my-12" />

    <!-- Token Design -->
    <HomepageTokenDesign />
    <USeparator class="my-12" />
  </div>
</template>
