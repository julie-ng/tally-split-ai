<script setup>
defineProps({
  subtitle: {
    type: String,
    required: false,
    default: '',
  },
  title: {
    type: [String, Number],
    required: false,
    default: '',
  },
  note: {
    type: String,
    required: false,
    default: '',
  },
})
</script>

<template>
  <div class="h-full">
    <UCard class="shadow-md/5 h-full">
      <div class="text-sm text-toned">
        <slot name="subtitle">
          {{ subtitle }}
        </slot>
      </div>
      <div class="text-2xl font-medium text-toned">
        <slot name="title">
          {{ title }}
        </slot>
        <div v-if="$slots.note || note" class="text-sm font-normal text-muted">
          <slot name="note">
            {{ note }}
          </slot>
        </div>
      </div>
    </UCard>
  </div>
</template>
