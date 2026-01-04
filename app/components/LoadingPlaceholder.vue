<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'Loading',
  },
  hashId: {
    type: String,
    required: false,
    default: ''
  }
})

const hasHashId = computed(() => props.hashId !== '')
</script>

<template>
  <div class="my-5 py-10 text-center border border-dashed border-slate-300 rounded-md">
    <UIcon
    name="i-lucide-loader-circle"
    class="animate-spin text-4xl text-blue-500" />

    <p class="mt-3 mb-1 font-bold">{{ props.title }}</p>
    <p v-if="hasHashId" class="font-mono text-slate-400 text-sm">{{ hashId }}</p>
  </div>
</template>
