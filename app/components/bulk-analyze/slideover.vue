<script setup>
const open = defineModel('open', { type: Boolean, default: false })

// const emit = defineEmits(['cancel'])
</script>

<template>
  <div>
    <USlideover
      v-model:open="open"
      title="Bulk Analyze"
      description="Run AI analysis on all the following receipts missing analyses."
      :ui="{ footer: 'justify-end', close: 'cursor-pointer' }"
    >
      <template #body>
        <USkeleton class="h-48" />
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          class="cursor-pointer"
          @click="open = false"
        />
        <UButton
          label="Submit"
          color="primary"
        />
      </template>
    </USlideover>
  </div>
</template>
