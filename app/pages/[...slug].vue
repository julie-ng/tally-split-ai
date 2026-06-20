<script setup>
const route = useRoute()

const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection('pages')
    .select('title', 'id', 'path', 'body')
    .path(route.path)
    .first()
})

if (!page.value) {
  setResponseStatus(useRequestEvent(), 404)
}

useHead({
  title: page.value ? page.value.title : 'Page Not Found',
})

definePageMeta({
  layout: {
    name: 'logged-out',
    props: {
      containerClass: 'max-w-7xl',
    },
  },
})

// max-w-7xl
// console.log('pageId:', page.value.id)
</script>

<template>
  <div class="mt-8 max-w-3xl">
    <article v-if="page">
      <h1 class="has-accent-border text-highlighted text-3xl font-bold tracking-tight mb-4">
        {{ page?.title }}
      </h1>
      <ContentRenderer
        :value="page"
        class="prose"
      />
    </article>
    <article v-else>
      <h1 class="text-4xl font-extrabold mb-4">
        Error 404
      </h1>
      <p>Article not found...</p>
    </article>
  </div>
</template>
