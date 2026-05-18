<script setup>
const { data: stack } = await useAsyncData(
  'landing-stack',
  () => queryCollection('architecture').first(),
)

const layers = computed(() => {
  const components = stack.value?.components ?? []
  return [
    {
      label: 'Serverless',
      items: components.slice(0, 3),
    },
    {
      label: 'Azure AI Services',
      items: components.slice(3, 6),
    },
    {
      label: 'Identity & Data',
      items: components.slice(6, 9),
    },
  ]
})
</script>

<template>
  <div id="architecture">
    <HomepageSectionHeading
      :heading="stack.heading"
      :subheading="stack.subheading"
    >
      {{ stack.description }}
    </HomepageSectionHeading>

    <div class="mt-8 mb-12 space-y-6">
      <section
        v-for="row in layers"
        :key="row.label"
        class="flex items-stretch gap-4"
      >
        <!-- Rotated label column — fixed width so both rows align -->
        <div class="w-12 flex items-center justify-center bg-neutral-100 rounded-md shrink-0">
          <h2 class="text-sm font-medium tracking-wider text-neutral-600 -rotate-90 whitespace-nowrap">
            {{ row.label }}
          </h2>
        </div>

        <!-- Cards row -->
        <div class="grid grid-cols-3 gap-4 flex-1">
          <UCard
            v-for="(component, i) in row.items"
            :key="`${row.label}-${i}`"
            class="shadow-md/5 h-full"
          >
            <UIcon :name="component.icon" class="size-6 text-neutral mb-2" />
            <h3 class="font-bold">
              {{ component.title }}
            </h3>
            <MDC :value="component.description" class="text-sm text-muted mt-1" />
          </UCard>
        </div>
      </section>
    </div>
  </div>
</template>
