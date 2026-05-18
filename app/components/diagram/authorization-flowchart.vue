<script setup>
import authZDiagram from '~~/docs/diagrams/auth-z.flowchart.mmd?raw'
</script>

<template>
  <UModal
    title="Authorization Flowchart"
    description="Something here"
    :ui="{ content: 'max-w-4xl' }"
    scrollable
  >
    <UButton
      label="View Authorization (AuthZ) Flowchart"
      color="primary"
      variant="solid"
      icon="i-lucide-zoom-in"
      class="hover:cursor-pointer px-4 py-3"
    />

    <template #body>
      <UiMermaid :code="authZDiagram" />
    </template>
  </UModal>
</template>
