<script setup>
const model = defineModel({
  type: String,
  default: 'grid',
})

const options = [
  { value: 'grid', label: 'Grid View', icon: 'i-lucide-layout-grid' },
  { value: 'list', label: 'List View', icon: 'i-lucide-list' },
]
</script>

<template>
  <div class="inline-block rounded-sm py-1.5 bg-slate-100 text-slate-500">
    <button
      v-for="option in options"
      :key="option.value"
      class="inline-flex items-center gap-1 rounded-sm px-2 py-2 mx-2 cursor-pointer"
      :class="model === option.value ? 'bg-white shadow-sm' : ''"
      @click="model = option.value"
    >
      <span class="text-sm">{{ option.label }}</span>
      <UIcon :name="option.icon" />
    </button>
  </div>
</template>
