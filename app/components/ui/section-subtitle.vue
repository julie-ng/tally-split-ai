<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  ui: {
    type: Object,
    required: false,
    default: () => ({ class: 'mt-2 mb-4 font-semibold text-primary-700',
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
