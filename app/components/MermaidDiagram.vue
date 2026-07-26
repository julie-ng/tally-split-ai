<script setup>
import mermaid from 'mermaid'

const props = defineProps({
  code: {
    type: String,
    required: true,
  },
})

const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`
const svg = ref('')
const error = ref(null)

async function render () {
  try {
    mermaid.initialize({ startOnLoad: false, theme: 'default' })
    const result = await mermaid.render(id, props.code)
    svg.value = result.svg
    error.value = null
  }
  catch (err) {
    error.value = err.message ?? String(err)
    svg.value = ''
  }
}

watch(() => props.code, render, { immediate: true })
</script>

<template>
  <ClientOnly>
    <div v-if="error" class="text-error text-sm font-mono whitespace-pre-wrap">
      {{ error }}
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="mermaid-diagram" v-html="svg" />
  </ClientOnly>
</template>
