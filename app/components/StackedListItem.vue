<script setup>
const props = defineProps({
  name: String,
  value: [String, Array]
})

const isStringValue = typeof props.value === 'string'
const isArrayValue = Array.isArray(props.value)

function notEmpty() {
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
  <article class="flex flex-row my-1" v-if="notEmpty()">
    <div class="basis-1/4 text-slate-400 text-sm">
      {{ props.name }}
    </div>
    <div v-if="isArrayValue" class="basis-3/4 text-slate-500 text-sm">
      <span v-for="tag, i in props.value" :id="i" class="px-2 py-1 mr-2 bg-blue-50 text-slate-400 rounded-sm text-xs">{{
        tag }}</span>
      <span v-if="props.value.length === 0">-</span>
    </div>
    <div v-if="isStringValue" class="basis-3/4 text-slate-400 text-sm">
      {{ props.value }}
    </div>
  </article>
</template>
