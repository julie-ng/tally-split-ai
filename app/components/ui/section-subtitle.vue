<script setup>
const props = defineProps({
  text: {
    type: String,
    required: false,
  },
  ui: {
    type: Object,
    required: false,
    default: () => ({ class: 'mt-2 mb-4 font-semibold text-primary',
    }),
  },
})
</script>

<template>
  <h1 :class="props.ui.class">
    <slot v-if="$slots.default" />
    <template v-else>
      {{ props.text }}
    </template>
  </h1>
</template>
