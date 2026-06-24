<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'Loading',
  },
  id: {
    type: String,
    default: '',
  },
})

const hasId = computed(() => props.id !== '')
</script>

<template>
  <div class="h-full my-5 py-10 text-center border bg-muted  border-default rounded-md">
    <UIcon
      name="i-lucide-search-alert"
      class="text-4xl text-dimmed"
    />
    <p class="mt-2 mb-1 font-bold">
      {{ props.title }}
    </p>
    <p v-if="hasId" class="font-mono text-dimmed text-sm">
      {{ id }}
    </p>
  </div>
</template>
