<script setup>
const props = defineProps({
  tags: Object,
  color: {
    type: String,
    required: false,
    default: 'neutral',
  },
  variant: {
    type: String,
    required: false,
    default: 'soft',
  },
  // customClass: {
  //   type: String,
  //   required: false,
  //   default: '',
  // },
  ui: {
    type: Object,
    required: false,
    default: () => {},
  },
})

const uiClasses = computed(() => {
  if (props.ui && Object.hasOwn(props.ui, 'class')) {
    return props.ui.class
  }
  else {
    return ''
  }
})
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UBadge
      v-for="(value, key) in props.tags"
      :key="key"
      :color="props.color"
      :variant="props.variant"
      :class="uiClasses"
    >
      {{ key }}: {{ value }}
    </UBadge>
  </div>
</template>
