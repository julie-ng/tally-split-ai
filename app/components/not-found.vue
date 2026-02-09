<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'Loading',
  },
  hashId: {
    type: [String, Number],
    default: '',
  },
})

const hasHashId = computed(() => props.hashId !== '')
</script>

<template>
  <div class="h-full my-5 py-10 text-center border bg-slate-50  border-slate-200 rounded-md">
    <UIcon
      name="i-lucide-search-alert"
      class="text-4xl text-slate-300"
    />
    <p class="mt-2 mb-1 font-bold">
      {{ props.title }}
    </p>
    <p v-if="hasHashId" class="font-mono text-slate-400 text-sm">
      {{ hashId }}
    </p>
  </div>
</template>
