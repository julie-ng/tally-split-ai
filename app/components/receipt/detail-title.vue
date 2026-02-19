<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  id: {
    type: Number,
    required: true,
  },
  isAnalyzed: {
    type: Boolean,
    required: true,
  },
  hasUploads: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const canAnalyze = computed(() => props.hasUploads && !props.isAnalyzed)
</script>

<template>
  <div class="flex items-center justify-between mb-2 ml-4">
    <h1 class="font-bold text-3xl">
      <template v-if="title">
        {{ title }}
      </template>
      <template v-else>
        {{ `Receipt #${id}` }}
      </template>
      <UBadge
        v-if="isAnalyzed"
        icon="i-lucide-focus"
        color="info"
        variant="outline"
        size="lg"
        class="ml-2"
      >
        Analyzed
      </UBadge>
    </h1>
    <div class="flex items-center gap-2">
      <!-- TODO: show disabled status for button if already analyzed -->
      <receipt-analyze-button
        v-if="!isAnalyzed"
        :id="props.id"
        :can-analyze="canAnalyze"
      />
      <UButton
        :to="`/receipts/${props.id}/edit`"
        icon="i-lucide-pencil"
        color="secondary"
        variant="solid"
        class="hover:cursor-pointer"
      >
        Edit
      </UButton>
    </div>
  </div>
</template>
