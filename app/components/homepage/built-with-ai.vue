<script setup>
const { data: sections } = await useAsyncData('home-built-with-ai', () =>
  queryCollection('builtWithAI')
    .order('stem', 'ASC')
    .all())

const defaultIcons = ['i-lucide-layers', 'i-lucide-pencil-ruler']
</script>

<template>
  <div id="built-with-ai">
    <HomepageSectionHeading
      heading="Built with AI"
      subheading="How I work"
    >
      Product quality and experience that only human judgment can provide
    </HomepageSectionHeading>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-x-20 mt-12">
      <div v-for="(section, i) in sections" :key="`built-with-ai-${i}`">
        <UIcon
          :name="section.icon || defaultIcons[i % defaultIcons.length]"
          class="size-5 text-primary mb-3"
        />
        <h3 class="text-xl font-bold mb-3">
          {{ section.title }}
        </h3>
        <div class="prose prose-neutral dark:prose-invert max-w-none text-muted">
          <ContentRenderer :value="section" />
        </div>
      </div>
    </div>
  </div>
</template>
