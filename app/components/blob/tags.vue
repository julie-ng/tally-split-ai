<script setup>
const props = defineProps({
  // Single tags prop - can be string or object
  tags: {
    type: [String, Object],
    required: true,
  },
  // For string type
  filter: {
    type: Array,
    required: false,
    default: () => [],
  },
  highlightTotal: {
    type: Boolean,
    required: false,
    default: false,
  },
  totalsMatch: {
    type: Boolean,
    required: false,
    default: true,
  },
  // For object type
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
  ui: {
    type: Object,
    required: false,
    default: () => ({}),
  },
})

const isStringType = computed(() => typeof props.tags === 'string')
</script>

<template>
  <blob-tags-string
    v-if="isStringType"
    :tags-as-string="props.tags"
    :filter="props.filter"
    :highlight-total="props.highlightTotal"
    :totals-match="props.totalsMatch"
  />
  <blob-tags-object
    v-else
    :tags="props.tags"
    :color="props.color"
    :variant="props.variant"
    :ui="props.ui"
  />
</template>
