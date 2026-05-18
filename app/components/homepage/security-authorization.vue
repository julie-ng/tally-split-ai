<script setup>
const { data: pages } = await useAsyncData('home-auth-z', async () => {
  const docs = await queryCollection('security')
    .where('path', 'LIKE', '/homepage/security/auth-z%')
    .all()
  return Object.fromEntries(docs.map(d => [d.path, d]))
})

const intro = computed(() => pages.value?.['/homepage/security/auth-z'])
const human = computed(() => pages.value?.['/homepage/security/auth-z-human'])
const task = computed(() => pages.value?.['/homepage/security/auth-z-task'])
</script>

<template>
  <div id="security-authorization">
    <HomepageSectionHeading
      :heading="intro.heading"
      :subheading="intro.subheading"
    >
      {{ intro.description }}
    </HomepageSectionHeading>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-x-20 mt-6">
      <div>
        <UIcon name="i-lucide-users" variant="soft" class="size-5 text-primary -mb-8" />
        <ContentRenderer v-if="human" :value="human" />
      </div>
      <div>
        <UIcon name="i-lucide-qr-code" variant="soft" class="size-5 text-primary -mb-8" />
        <ContentRenderer v-if="task" :value="task" />
      </div>
    </div>

    <div class="mt-6 text-center">
      <DiagramAuthorizationFlowchart />
    </div>
  </div>
</template>
