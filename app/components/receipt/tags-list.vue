<script setup>
const props = defineProps({
  tags: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: false,
    default: 'info',
  },
  variant: {
    type: String,
    required: false,
    default: 'soft',
  },
})

const tagList = computed(() => receiptUtils.receiptTagsToDisplayArray(props.tags))
</script>

<template>
  <div>
    <UBadge
      v-for="(tag, i) in tagList"
      :key="`tag-${i}`"
      class="text-slate-500 m"
      :color="color"
      :variant="variant"
    >
      {{ tag }}
    </UBadge>
  </div>
</template>
