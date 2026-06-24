<script setup>
const props = defineProps({
  name: String,
  value: [String, Array],
})

const isStringValue = typeof props.value === 'string'
const isArrayValue = Array.isArray(props.value)

function notEmpty () {
  if (isStringValue && props.value !== '') {
    return true
  }
  if (isArrayValue && props.value.length > 0) {
    return true
  }
  return false
}
</script>

<template>
  <article v-if="notEmpty()" class="flex flex-row my-1">
    <div class="basis-1/4 text-dimmed text-sm">
      {{ props.name }}
    </div>
    <div v-if="isArrayValue" class="basis-3/4 text-muted text-sm">
      <span v-for="tag, i in props.value" :key="i" class="px-2 py-1 mr-2 bg-blue-50 text-dimmed rounded-sm text-xs">
        {{ tag }}
      </span>
      <span v-if="props.value.length === 0">-</span>
    </div>
    <div v-if="isStringValue" class="basis-3/4 text-dimmed text-sm">
      {{ props.value }}
    </div>
  </article>
</template>
