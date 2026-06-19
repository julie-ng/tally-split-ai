<script setup>
const { data: content } = await useAsyncData('home-lessons-learned', () =>
  queryCollection('lessonsLearned')
    .first())

const sections = computed(() => content.value?.sections ?? [])

const defaultIcon = 'i-lucide-lightbulb'

const paragraphs = description => (description ?? '')
  .split(/\n{2,}/)
  .map(p => p.trim())
  .filter(Boolean)
</script>

<template>
  <div id="lessons-learned">
    <HomepageSectionHeading
      v-if="content"
      :heading="content.heading"
      :subheading="content.subheading"
    >
      {{ content.description }}
    </HomepageSectionHeading>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-x-20 mt-12">
      <div v-for="(section, i) in sections" :key="`lessons-learned-${i}`">
        <UIcon :name="section.icon || defaultIcon" class="size-5 text-primary mb-3" />
        <h3 class="text-xl font-bold mb-3">
          {{ section.heading }}
        </h3>
        <p
          v-for="(p, pIndex) in paragraphs(section.description)"
          :key="`lessons-learned-${i}-p-${pIndex}`"
          class="text-muted mb-4 last:mb-0"
        >
          {{ p }}
        </p>
      </div>
    </div>
  </div>
</template>
