<script setup>
import tokenLifecycle from '~~/docs/diagrams/token-lifecycle.sequence.mmd?raw'
</script>

<template>
  <UModal
    title="Token Lifecycle Sequence Diagram"
    description="Something here"
    :ui="{ content: 'max-w-6xl' }"
    scrollable
  >
    <UButton
      label="View Token Lifecyle Diagram"
      color="primary"
      variant="solid"
      icon="i-lucide-zoom-in"
      class="hover:cursor-pointer px-4 py-3"
    />

    <template #body>
      <UiMermaid :code="tokenLifecycle" />
    </template>
  </UModal>
</template>
