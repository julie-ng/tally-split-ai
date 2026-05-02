<script setup>
const props = defineProps({
  subtitle: {
    type: String,
    required: true,
  },
  metric: {
    type: [String, Number],
    required: true,
  },
  note: {
    type: String,
    required: false,
    default: '',
  },
  icon: {
    type: String,
    required: false,
    default: 'i-lucide-dot',
  },
  fullHeight: {
    type: Boolean,
    default: false,
  },
})

const hasNote = computed(() => props.note !== '')
</script>

<template>
  <div :class="{ 'h-full': props.fullHeight }">
    <UCard
      class="shadow-md/5 relative overflow-hidden"
      :class="{ 'h-full': props.fullHeight }"
    >
      <!-- <UIcon
        :name="props.icon"
        class="absolute bottom-1 right-1 size-18 text-dimmed opacity-30 pointer-events-none"
      /> -->
      <UIcon :name="props.icon" class="size-5" />
      <!-- <UIcon name="i-lucide-search-alert" class="size-5" />
      <UIcon name="i-lucide-search-slash" class="size-5" />
      <UIcon name="i-lucide-search-x" class="size-5" />
      <UIcon name="i-lucide-file-check" class="size-5" />
      <UIcon name="i-lucide-file-x" class="size-5" />
      <UIcon name="i-lucide-file-search" class="size-5" />
      <UIcon name="i-lucide-file-question-mark" class="size-5" />
      <UIcon name="i-lucide-file-exclamation-point" class="size-5" /> -->
      <div class="text-2xl mb-2">
        <!-- <UIcon :name="props.icon" class="size-6 align-middle -mt-1 mr-1" /> -->
        {{ props.metric }}
      </div>
      <div class="text-sm font-medium text-muted mb-0.5">
        {{ props.subtitle }}
      </div>
      <p v-if="hasNote" class="text-xs font-normal text-dimmed">
        {{ props.note }}
      </p>
    </UCard>
  </div>
</template>
